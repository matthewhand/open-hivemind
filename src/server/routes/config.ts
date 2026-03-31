import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { redactSensitiveInfo } from '../../common/redactSensitiveInfo';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import llmConfig from '../../config/llmConfig';
import { getLlmDefaultStatus } from '../../config/llmDefaultStatus';
import { getLlmProfiles, saveLlmProfiles } from '../../config/llmProfiles';
import llmTaskConfig from '../../config/llmTaskConfig';
import messageConfig from '../../config/messageConfig';
import { getMessageProfiles, saveMessageProfiles } from '../../config/messageProfiles';
import { UserConfigStore } from '../../config/UserConfigStore';
import webhookConfig from '../../config/webhookConfig';
import { BotManager } from '../../managers/BotManager';
import { providerRegistry } from '../../registries/ProviderRegistry';
import { createLogger } from '../../common/StructuredLogger';
import { HTTP_STATUS } from '../../types/constants';
import { ErrorUtils } from '../../types/errors';
import { type IProvider } from '../../types/IProvider';
import {
  CreateLlmProfileSchema,
  CreateMemoryProfileSchema,
  CreateMessageProfileSchema,
  CreateToolProfileSchema,
  LlmProfileKeyParamSchema,
  MemoryProfileKeyParamSchema,
  ToolProfileKeyParamSchema,
  UpdateLlmProfileSchema,
} from '../../validation/schemas/configProfilesSchema';
import { ConfigUpdateSchema } from '../../validation/schemas/configSchema';
import { validateRequest } from '../../validation/validateRequest';
import { auditMiddleware, logConfigChange, type AuditedRequest } from '../middleware/audit';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Validates that a config name is safe to use in file paths.
 * Only allows alphanumeric characters, hyphens, and underscores.
 * Prevents path traversal attacks.
 */
function isValidConfigName(configName: string): boolean {
  // Config names must:
  // 1. Be 1-64 characters long
  // 2. Only contain lowercase letters, numbers, hyphens, and underscores
  // 3. Not start or end with a hyphen or underscore
  // 4. Not contain consecutive hyphens or underscores
  const validConfigNamePattern = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/;
  return (
    typeof configName === 'string' &&
    configName.length >= 1 &&
    configName.length <= 64 &&
    validConfigNamePattern.test(configName) &&
    !configName.includes('--') &&
    !configName.includes('__') &&
    !configName.includes('_-') &&
    !configName.includes('-_')
  );
}

/**
 * Validates that a file path is within an allowed base directory.
 * Prevents path traversal by resolving the path and checking the prefix.
 */
function isPathWithinAllowed(targetPath: string, allowedBasePath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(allowedBasePath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

const debug = Debug('app:server:routes:config');
const router = Router();
const logger = createLogger('configRouter');

// Core schemas that are always present
const coreSchemaSources: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  llmTask: llmTaskConfig,
  webhook: webhookConfig,
};

// Map of base config types to their convict objects (used as schema sources)
let schemaSources: Record<string, any> = { ...coreSchemaSources };

// Map of all active config instances
let globalConfigs: Record<string, any> = { ...schemaSources };

// Helper to load dynamic configs from files
const loadDynamicConfigs = async () => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const providersDir = path.join(configDir, 'providers');

    try {
      const files = await fs.promises.readdir(providersDir);

      files.forEach((file) => {
        // Match pattern: type-name.json e.g. openai-dev.json
        const match = file.match(/^([a-z]+)-(.+)\.json$/);
        if (match) {
          const type = match[1];
          const name = match[0].replace('.json', ''); // e.g. openai-dev

          if (schemaSources[type] && !globalConfigs[name]) {
            debug(`Loading dynamic config: ${name} (type: ${type})`);
            // Create new convict instance using the base type's schema
            const convict = require('convict'); // Require local to avoid module caching issues if any

            // schemaSources[type] is likely a convict instance (if from provider.getConfig() or core),
            // so .getSchema() works.
            const newConfig = convict(schemaSources[type].getSchema());

            // Load file
            newConfig.loadFile(path.join(providersDir, file));
            try {
              newConfig.validate({ allowed: 'warn' });
            } catch (e) {
              logger.warn(`Validation warning for ${name}:`, e);
            }

            globalConfigs[name] = newConfig;
          }
        }
      });
    } catch (e: any) {
      if ((e as any).code !== 'ENOENT') {
        throw e;
      }
    }
  } catch (e) {
    logger.error('Failed to load dynamic configs:', e);
  }
};

// Initialize configuration from registry
export const reloadGlobalConfigs = async () => {
  const providers = providerRegistry.getAll();
  providers.forEach((p) => {
    schemaSources[p.id] = p.getConfig();
  });

  // Reset globalConfigs with updated schemas
  globalConfigs = { ...schemaSources };

  // Load dynamic configs
  await loadDynamicConfigs();

  debug(
    'Global configs reloaded with providers:',
    providers.map((p) => p.id)
  );
};

// Apply audit middleware to all config routes (except in test)
if (process.env.NODE_ENV !== 'test') {
  router.use(auditMiddleware);
}

// GET /api/config/ping - Diagnostic endpoint
router.get('/ping', (req, res) => {
  return res.json(ApiResponse.success({ timestamp: new Date().toISOString() }));
});

// Sensitive key patterns for redaction (fallback)
const SENSITIVE_PATTERNS = [/token/i, /key/i, /secret/i, /password/i, /credential/i, /auth/i];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

function redactValue(value: any): string {
  if (!value) {
    return '';
  }
  const str = String(value);
  if (str.length <= 8) {
    return '••••••••';
  }
  return str.slice(0, 4) + '••••' + str.slice(-4);
}

function redactObject(obj: any, parentKey = ''): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    // Check if key corresponds to a provider (e.g. "slack": {...})
    const provider = providerRegistry.get(key);
    if (provider && value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactProviderConfig(value as any, provider);
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactObject(value as any, fullKey);
    } else if (isSensitiveKey(key) && value) {
      result[key] = {
        isRedacted: true,
        redactedValue: redactValue(value),
        hasValue: true,
      };
    } else {
      result[key] = value;
    }
  }
  return result;
}

function redactProviderConfig(config: any, provider: IProvider): any {
  const sensitiveKeys = new Set(provider.getSensitiveKeys());
  const result: any = {};
  for (const [key, value] of Object.entries(config)) {
    if (sensitiveKeys.has(key) && value) {
      result[key] = {
        isRedacted: true,
        redactedValue: redactValue(value),
        hasValue: true,
      };
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recurse? Provider config might be nested?
      // Usually flat or simple nesting.
      // Convict schemas are flat-ish but can be nested.
      // Does getSensitiveKeys return dotted paths?
      // Provider implementation returns e.g. ['SLACK_BOT_TOKEN'].
      // These are usually environment variable names or config keys.
      // In convict, properties can be nested.
      // If key matches sensitive key, redact.
      result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

// GET /api/config/bots - List all configured bots with redacted secrets
router.get('/bots', async (req, res) => {
  try {
    const botManager = BotManager.getInstance();
    const bots = await botManager.getAllBots();
    const manager = BotConfigurationManager.getInstance();

    // Redact sensitive values before sending to frontend
    const safeBots = bots.map((bot: any) => {
      // Create a merged object that includes top-level props and the config object
      const mergedBot = {
        ...bot,
        ...(bot.config || {}),
      };

      const redacted = redactObject(mergedBot as any);

      return {
        ...redacted,
        id: bot.id,
        name: bot.name,
        messageProvider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        isActive: bot.isActive,
        source: bot.source || (bot.config && Object.keys(bot.config).length > 0 ? 'db' : 'env'),
        config: redactObject(bot.config || {}),
        errorCount: 0,
        messageCount: 0,
        connected: bot.isActive,
      };
    });

    return res.json(
      ApiResponse.success({
        bots: safeBots,
        count: safeBots.length,
        warnings: manager.getWarnings(),
      })
    );
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'CONFIG_BOTS_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// GET /api/config/sources - List all configuration sources
router.get('/sources', async (req, res) => {
  try {
    const envVars = Object.keys(process.env)
      .filter(
        (key) =>
          key.startsWith('BOTS_') ||
          key.includes('DISCORD_') ||
          key.includes('SLACK_') ||
          key.includes('OPENAI_') ||
          key.includes('FLOWISE_') ||
          key.includes('OPENWEBUI_') ||
          key.includes('MATTERMOST_') ||
          key.includes('MESSAGE_') ||
          key.includes('WEBHOOK_')
      )
      .reduce(
        (acc, key) => {
          acc[key] = {
            source: 'environment',
            value: redactSensitiveInfo(key, process.env[key] || ''),
            sensitive:
              key.toLowerCase().includes('token') ||
              key.toLowerCase().includes('key') ||
              key.toLowerCase().includes('secret'),
          };
          return acc;
        },
        {} as Record<string, any>
      );

    // Detect config files
    const configDir = path.join(process.cwd(), 'config');
    const configFiles: any[] = [];

    try {
      const files = await fs.promises.readdir(configDir);
      const statPromises = files
        .filter((file) => file.endsWith('.json') || file.endsWith('.js') || file.endsWith('.ts'))
        .map(async (file) => {
          const filePath = path.join(configDir, file);
          const stats = await fs.promises.stat(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime,
            type: path.extname(file).slice(1),
          };
        });

      const fileStats = await Promise.all(statPromises);
      configFiles.push(...fileStats);
    } catch (e: any) {
      if ((e as any).code !== 'ENOENT') {
        throw e;
      }
    }

    return res.json(ApiResponse.success({ envVars, configFiles, count: configFiles.length }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error((hivemindError as any).message, 'CONFIG_SOURCES_ERROR', 500));
  }
});

// GET /api/config/unified-sources - Config key → source layer mapping via UnifiedConfigStore
router.get('/unified-sources', (req, res) => {
  try {
    const { UnifiedConfigStore } = require('../../config/UnifiedConfigStore');
    const store = UnifiedConfigStore.getInstance();
    const sources = store.getAllSources();
    const layers: string[] = ['env', 'secure', 'provider', 'user', 'profile', 'default'];

    return res.json(ApiResponse.success({ sources, layers }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error((hivemindError as any).message, 'UNIFIED_SOURCES_ERROR', 500));
  }
});

// GET /api/config/source/:key - Source layer for a single config key
router.get('/source/:key', (req, res) => {
  try {
    const { UnifiedConfigStore } = require('../../config/UnifiedConfigStore');
    const store = UnifiedConfigStore.getInstance();
    const { key } = req.params;
    const source = store.getSource(key);

    if (!source) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Key '${key}' not found in any config layer`, 'KEY_NOT_FOUND', 404));
    }

    return res.json(ApiResponse.success({ key, source }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error((hivemindError as any).message, 'CONFIG_SOURCE_ERROR', 500));
  }
});

// GET /api/config/llm-status - Get LLM configuration status
router.get('/llm-status', (req, res) => {
  try {
    const status = getLlmDefaultStatus();
    return res.json(status);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_STATUS_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// GET /api/config/llm-profiles - List all LLM profiles
router.get('/llm-profiles', (req, res) => {
  try {
    const profiles = getLlmProfiles();
    return res.json(profiles);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILES_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.post('/llm-profiles', validateRequest(CreateLlmProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;

    const modelType = newProfile.modelType || 'chat';
    if (!['chat', 'embedding', 'both'].includes(modelType)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(
          ApiResponse.error(
            `Invalid modelType '${modelType}'. Must be one of: chat, embedding, both`,
            'INVALID_REQUEST',
            400
          )
        );
    }

    const profiles = getLlmProfiles();
    if (profiles.llm.find((p) => p.key.toLowerCase() === newProfile.key.toLowerCase())) {
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `LLM profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    }

    const sanitizedProfile = {
      ...newProfile,
      modelType,
    };

    profiles.llm.push(sanitizedProfile);
    saveLlmProfiles(profiles);

    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: sanitizedProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILE_CREATE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// PUT /api/config/llm-profiles/:key - Update an LLM profile
router.put('/llm-profiles/:key', validateRequest(UpdateLlmProfileSchema), (req, res) => {
  try {
    const { key } = req.params;
    const updates = req.body;

    const profiles = getLlmProfiles();
    const normalizedKey = key.toLowerCase();
    const index = profiles.llm.findIndex((p) => p.key.toLowerCase() === normalizedKey);

    if (index === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`LLM profile with key '${key}' not found`, undefined, 404));
    }

    const updatedProfile = {
      ...profiles.llm[index],
      ...updates,
      modelType: updates.modelType || profiles.llm[index].modelType || 'chat',
    };
    profiles.llm[index] = updatedProfile;

    saveLlmProfiles(profiles);

    return res.json(ApiResponse.success({ profile: updatedProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILE_UPDATE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.delete('/llm-profiles/:key', validateRequest(LlmProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = getLlmProfiles();
    const index = profiles.llm.findIndex(
      (profile) => profile.key.toLowerCase() === key.toLowerCase()
    );

    if (index === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`LLM profile with key '${key}' not found`, undefined, 404));
    }

    const [deletedProfile] = profiles.llm.splice(index, 1);
    saveLlmProfiles(profiles);

    return res.json(ApiResponse.success({ profile: deletedProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'LLM_PROFILE_DELETE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// ... (Rest of the file mostly same, except global config redaction)

// Helper to safely deep clone convict schemas while skipping function-valued properties.
// structuredClone throws on schemas with native functions; JSON.stringify silently drops
// them but is slower. This custom clone handles both cases correctly and idiomatically.
const deepCloneSchema = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return (obj as unknown[]).map((item: any) => deepCloneSchema(item));
  }
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, val]) => typeof val !== 'function')
      .map(([key, val]) => [key, deepCloneSchema(val)])
  );
};

// GET /api/config/global - Get all global configurations (schema + values)
router.get('/global', (req, res) => {
  try {
    const response: Record<string, any> = {};

    Object.entries(globalConfigs).forEach(([key, config]) => {
      // Get properties (values)
      const props = config.getProperties();

      // Get schema and deep clone it to avoid mutating the source
      // Native structuredClone throws on convict schemas due to native functions,
      // so we use a fast custom clone that strips them out like JSON.stringify would.
      const schema = deepCloneSchema(config.getSchema());

      // Check for environment variable overrides and mark as locked
      const properties = schema.properties || schema;

      for (const propKey in properties) {
        const prop = properties[propKey];
        if (typeof prop === 'object' && prop !== null) {
          if (prop.env && process.env[prop.env] !== undefined && process.env[prop.env] !== '') {
            prop.locked = true;
          }
        }
      }

      // Redact sensitive values in props
      const redactedProps = structuredClone(props); // Deep copy

      // Helper to redact recursively using provider metadata if available
      const provider = providerRegistry.get(key); // key is config name, e.g. 'slack'

      if (provider) {
        const sensitive = new Set(provider.getSensitiveKeys());
        // Simple redaction for provider props
        // Convict properties might be nested, but sensitive keys from provider are likely top-level env vars mapped to keys?
        // SlackProvider.getSensitiveKeys() returns ['SLACK_BOT_TOKEN'].
        // In convict: SLACK_BOT_TOKEN: { ... }
        // So keys match.
        for (const k in redactedProps) {
          if (sensitive.has(k)) {
            redactedProps[k] = '********';
          }
        }
      } else {
        // Fallback generic redaction
        const redactObjectFallback = (obj: any) => {
          for (const k in obj) {
            if (typeof obj[k] === 'object' && obj[k] !== null) {
              redactObjectFallback(obj[k]);
            } else if (typeof k === 'string') {
              if (isSensitiveKey(k)) {
                obj[k] = '********';
              }
            }
          }
        };
        redactObjectFallback(redactedProps);
      }

      response[key] = {
        values: redactedProps,
        schema: schema,
      };
    });

    // Include user's saved general settings from user-config.json
    const userConfigStore = UserConfigStore.getInstance();
    const generalSettings = userConfigStore.getGeneralSettings();
    if (Object.keys(generalSettings).length > 0) {
      response._userSettings = {
        values: generalSettings,
        schema: null, // No schema for user settings
        source: 'user-config.json',
      };
    }

    return res.json(response);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          (hivemindError as any).code || 'CONFIG_GLOBAL_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// ... (PUT /global same logic, uses schemaSources)

// PUT /api/config/global - Update global configuration
router.put('/global', validateRequest(ConfigUpdateSchema), async (req, res) => {
  try {
    const { configName, updates, ...directUpdates } = req.body;

    if (configName && !isValidConfigName(configName)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Invalid config name', undefined, 400));
    }

    if (!configName) {
      const userConfigStore = UserConfigStore.getInstance();
      const settingsToSave = updates || directUpdates;
      await userConfigStore.setGeneralSettings(settingsToSave);

      if (process.env.NODE_ENV !== 'test') {
        logConfigChange(
          req as AuditedRequest,
          'UPDATE',
          'config/general',
          'success',
          'Updated general settings'
        );
      }

      return res.json(ApiResponse.success());
    }

    let config = globalConfigs[configName];
    let createdNew = false;

    if (!config) {
      const match = configName.match(/^([a-z]+)-[a-zA-Z0-9-_]+$/);
      if (match && schemaSources[match[1]]) {
        const type = match[1];
        debug(`Creating new dynamic config: ${configName} (type: ${type})`);
        const convict = require('convict');
        config = convict(schemaSources[type].getSchema());
        globalConfigs[configName] = config;
        createdNew = true;
      } else {
        // Updated error message to use schemaSources keys
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            ApiResponse.error(
              `Invalid configName '${configName}'. Must be existing or match 'type-name' pattern. Valid types: ${Object.keys(schemaSources).join(', ')}`,
              undefined,
              400
            )
          );
      }
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');

    let targetFile = '';
    // If it's one of the base sources, use its standard file (from registry id or core)
    // Core sources: message, llm, webhook
    // Provider sources: slack, discord, etc.

    // Check if configName matches a known schema source (provider id or core)
    if (schemaSources[configName] && !createdNew) {
      // Use convention: providers/{configName}.json
      targetFile = `providers/${configName}.json`;
    } else {
      // Dynamic named config
      targetFile = `providers/${configName}.json`;
    }

    const targetPath = path.join(configDir, targetFile);

    // Security: Ensure the target path is within the config directory
    if (!isPathWithinAllowed(targetPath, configDir)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Invalid config path', undefined, 400));
    }

    // Read existing file if not creating new
    let fileContent: any = {};
    try {
      const data = await fs.promises.readFile(targetPath, 'utf8');
      fileContent = JSON.parse(data);
    } catch (e) {
      // ignore
    }

    const newContent = { ...fileContent, ...updates };

    const targetDir = path.dirname(targetPath);
    await fs.promises.mkdir(targetDir, { recursive: true });

    await fs.promises.writeFile(targetPath, JSON.stringify(newContent, null, 2));

    config.load(newContent);
    config.validate({ allowed: 'warn' });

    if (process.env.NODE_ENV !== 'test') {
      logConfigChange(
        req as AuditedRequest,
        'UPDATE',
        `config/${configName}`,
        'success',
        `Updated configuration for ${configName}`
      );
    }

    return res.json(ApiResponse.success());
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          (hivemindError as any).code || 'CONFIG_GLOBAL_PUT_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// ... (Rest of file)

router.get('/message-profiles', (req, res) => {
  try {
    const profiles = getMessageProfiles();
    return res.json(profiles);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MESSAGE_PROFILES_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.post('/message-profiles', validateRequest(CreateMessageProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;

    const profiles = getMessageProfiles();

    // Check if key already exists
    if (profiles.message.find((p) => p.key === newProfile.key)) {
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `Message profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    }

    profiles.message.push(newProfile);
    saveMessageProfiles(profiles);

    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: newProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MESSAGE_PROFILES_CREATE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

// -- Memory Profiles CRUD --

const memoryProfilesModule = require('../../config/memoryProfiles');

const toolProfilesModule = require('../../config/toolProfiles');

router.get('/memory-profiles', (_req, res) => {
  try {
    const profiles = memoryProfilesModule.getMemoryProfiles();
    return res.json(ApiResponse.success(profiles));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MEMORY_PROFILES_GET_ERROR',
        )
      );
  }
});

router.post('/memory-profiles', validateRequest(CreateMemoryProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    if (profiles.memory.find((p: any) => p.key === newProfile.key))
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `Memory profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
          )
        );
    profiles.memory.push(newProfile);
    memoryProfilesModule.saveMemoryProfiles(profiles);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: newProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MEMORY_PROFILES_CREATE_ERROR',
        )
      );
  }
});

router.put('/memory-profiles/:key', validateRequest(MemoryProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
    profiles.memory[index] = { ...profiles.memory[index], ...req.body, key };
    memoryProfilesModule.saveMemoryProfiles(profiles);
    return res.json(ApiResponse.success({ profile: profiles.memory[index] }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MEMORY_PROFILES_UPDATE_ERROR',
        )
      );
  }
});

router.delete('/memory-profiles/:key', validateRequest(MemoryProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = memoryProfilesModule.getMemoryProfiles();
    const index = profiles.memory.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Memory profile '${key}' not found`, 'NOT_FOUND'));
    profiles.memory.splice(index, 1);
    memoryProfilesModule.saveMemoryProfiles(profiles);
    return res.json(ApiResponse.success());
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'MEMORY_PROFILES_DELETE_ERROR',
        )
      );
  }
});

// -- Tool Profiles CRUD --

router.get('/tool-profiles', (_req, res) => {
  try {
    const profiles = toolProfilesModule.getToolProfiles();
    return res.json(profiles);
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_GET_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.post('/tool-profiles', validateRequest(CreateToolProfileSchema), (req, res) => {
  try {
    const newProfile = req.body;
    const profiles = toolProfilesModule.getToolProfiles();
    if (profiles.tool.find((p: any) => p.key === newProfile.key))
      return res
        .status(HTTP_STATUS.CONFLICT)
        .json(
          ApiResponse.error(
            `Tool profile with key '${newProfile.key}' already exists`,
            'CONFLICT',
            409
          )
        );
    profiles.tool.push(newProfile);
    toolProfilesModule.saveToolProfiles(profiles);
    return res.status(HTTP_STATUS.CREATED).json(ApiResponse.success({ profile: newProfile }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_CREATE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.put('/tool-profiles/:key', validateRequest(ToolProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = toolProfilesModule.getToolProfiles();
    const index = profiles.tool.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Tool profile '${key}' not found`, 'NOT_FOUND', 404));
    profiles.tool[index] = { ...profiles.tool[index], ...req.body, key };
    toolProfilesModule.saveToolProfiles(profiles);
    return res.json(ApiResponse.success({ profile: profiles.tool[index] }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_UPDATE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

router.delete('/tool-profiles/:key', validateRequest(ToolProfileKeyParamSchema), (req, res) => {
  try {
    const { key } = req.params;
    const profiles = toolProfilesModule.getToolProfiles();
    const index = profiles.tool.findIndex((p: any) => p.key === key);
    if (index === -1)
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(ApiResponse.error(`Tool profile '${key}' not found`, 'NOT_FOUND', 404));
    profiles.tool.splice(index, 1);
    toolProfilesModule.saveToolProfiles(profiles);
    return res.json(ApiResponse.success());
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status((hivemindError as any).statusCode || 500)
      .json(
        ApiResponse.error(
          (hivemindError as any).message,
          'TOOL_PROFILES_DELETE_ERROR',
          (hivemindError as any).statusCode || 500
        )
      );
  }
});

export default router;
