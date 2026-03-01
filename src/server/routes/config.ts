import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { testMattermostConnection } from '@hivemind/adapter-mattermost';
import { testSlackConnection } from '@hivemind/adapter-slack';
import { redactSensitiveInfo } from '../../common/redactSensitiveInfo';
import { BotConfigurationManager } from '../../config/BotConfigurationManager';
import {
  getGuardrailProfiles,
  saveGuardrailProfiles,
  type GuardrailProfile,
} from '../../config/guardrailProfiles';
import llmConfig from '../../config/llmConfig';
import { getLlmDefaultStatus } from '../../config/llmDefaultStatus';
import { getLlmProfiles, saveLlmProfiles, type ProviderProfile } from '../../config/llmProfiles';
import {
  createMcpServerProfile,
  deleteMcpServerProfile,
  getMcpServerProfiles,
  updateMcpServerProfile,
} from '../../config/mcpServerProfiles';
import messageConfig from '../../config/messageConfig';
import { getMessageDefaultStatus } from '../../config/messageDefaultStatus';
import {
  getMessageProfiles,
  saveMessageProfiles,
  type MessageProfile,
} from '../../config/messageProfiles';
import {
  createResponseProfile,
  deleteResponseProfile,
  getResponseProfiles,
  updateResponseProfile,
  type ResponseProfile,
} from '../../config/responseProfileManager';
import { UserConfigStore } from '../../config/UserConfigStore';
import webhookConfig from '../../config/webhookConfig';
import { BotManager } from '../../managers/BotManager';
import { providerRegistry } from '../../registries/ProviderRegistry';
import DemoModeService from '../../services/DemoModeService';
import { ErrorUtils, HivemindError } from '../../types/errors';
import { type IProvider } from '../../types/IProvider';
import {
  ConfigBackupSchema,
  ConfigRestoreSchema,
  ConfigUpdateSchema,
} from '../../validation/schemas/configSchema';
import { validateRequest } from '../../validation/validateRequest';
import { AuditedRequest, auditMiddleware, logConfigChange } from '../middleware/audit';

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

// Core schemas that are always present
const coreSchemaSources: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  webhook: webhookConfig,
};

// Map of base config types to their convict objects (used as schema sources)
let schemaSources: Record<string, any> = { ...coreSchemaSources };

// Map of all active config instances
let globalConfigs: Record<string, any> = { ...schemaSources };

// Helper to load dynamic configs from files
const loadDynamicConfigs = () => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const providersDir = path.join(configDir, 'providers');

    if (fs.existsSync(providersDir)) {
      const files = fs.readdirSync(providersDir);

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
              console.warn(`Validation warning for ${name}:`, e);
            }

            globalConfigs[name] = newConfig;
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to load dynamic configs:', e);
  }
};

// Initialize configuration from registry
export const reloadGlobalConfigs = () => {
  const providers = providerRegistry.getAll();
  providers.forEach((p) => {
    schemaSources[p.id] = p.getConfig();
  });

  // Reset globalConfigs with updated schemas
  globalConfigs = { ...schemaSources };

  // Load dynamic configs
  loadDynamicConfigs();

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
  return res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

// Sensitive key patterns for redaction (fallback)
const SENSITIVE_PATTERNS = [/token/i, /key/i, /secret/i, /password/i, /credential/i, /auth/i];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

function redactValue(value: unknown): string {
  if (!value) {
    return '';
  }
  const str = String(value);
  if (str.length <= 8) {
    return '••••••••';
  }
  return str.slice(0, 4) + '••••' + str.slice(-4);
}

function redactObject(obj: Record<string, unknown>, parentKey = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    // Check if key corresponds to a provider (e.g. "slack": {...})
    const provider = providerRegistry.get(key);
    if (provider && value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactProviderConfig(value as Record<string, unknown>, provider);
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>, fullKey);
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

function redactProviderConfig(
  config: Record<string, unknown>,
  provider: IProvider
): Record<string, unknown> {
  const sensitiveKeys = new Set(provider.getSensitiveKeys());
  const result: Record<string, unknown> = {};
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

      const redacted = redactObject(mergedBot as Record<string, unknown>);

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

    return res.json({
      bots: safeBots,
      count: safeBots.length,
      warnings: manager.getWarnings(),
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'CONFIG_BOTS_ERROR',
    });
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

    if (fs.existsSync(configDir)) {
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
    }

    return res.json({
      envVars,
      configFiles,
      count: configFiles.length,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(500).json({
      error: hivemindError.message,
      code: 'CONFIG_SOURCES_ERROR',
    });
  }
});

// GET /api/config/llm-status - Get LLM configuration status
router.get('/llm-status', (req, res) => {
  try {
    const status = getLlmDefaultStatus();
    return res.json(status);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_STATUS_GET_ERROR',
    });
  }
});

// GET /api/config/llm-profiles - List all LLM profiles
router.get('/llm-profiles', (req, res) => {
  try {
    const profiles = getLlmProfiles();
    return res.json(profiles);
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_PROFILES_GET_ERROR',
    });
  }
});

// PUT /api/config/llm-profiles/:key - Update an LLM profile
router.put('/llm-profiles/:key', (req, res) => {
  try {
    const { key } = req.params;
    const updates = req.body;

    // Validation
    if (!updates.name || updates.name.trim() === '') {
      return res.status(400).json({ error: 'LLM profile name is required' });
    }
    if (!updates.provider || updates.provider.trim() === '') {
      return res.status(400).json({ error: 'LLM profile provider is required' });
    }

    const profiles = getLlmProfiles();
    const normalizedKey = key.toLowerCase();
    const index = profiles.llm.findIndex((p) => p.key.toLowerCase() === normalizedKey);

    if (index === -1) {
      return res.status(404).json({ error: `LLM profile with key '${key}' not found` });
    }

    const updatedProfile = { ...profiles.llm[index], ...updates };
    profiles.llm[index] = updatedProfile;

    saveLlmProfiles(profiles);

    return res.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: 'LLM_PROFILE_UPDATE_ERROR',
    });
  }
});

// ... (Rest of the file mostly same, except global config redaction)

// GET /api/config/global - Get all global configurations (schema + values)
router.get('/global', (req, res) => {
  try {
    const response: Record<string, any> = {};

    Object.entries(globalConfigs).forEach(([key, config]) => {
      // Get properties (values)
      const props = config.getProperties();

      // Get schema and deep clone it to avoid mutating the source
      const schema = JSON.parse(JSON.stringify(config.getSchema()));

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
      const redactedProps = JSON.parse(JSON.stringify(props)); // Deep copy

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
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_GLOBAL_GET_ERROR',
    });
  }
});

// ... (PUT /global same logic, uses schemaSources)

// PUT /api/config/global - Update global configuration
router.put('/global', validateRequest(ConfigUpdateSchema), async (req, res) => {
  try {
    const { configName, updates, ...directUpdates } = req.body;

    if (configName && !isValidConfigName(configName)) {
      return res.status(400).json({
        error: 'Invalid config name',
        message:
          'Config name must be 1-64 characters, lowercase alphanumeric with hyphens/underscores only',
      });
    }

    if (!configName) {
      const userConfigStore = UserConfigStore.getInstance();
      const settingsToSave = updates || directUpdates;
      await userConfigStore.setGeneralSettings(settingsToSave);

      if (process.env.NODE_ENV !== 'test') {
        logConfigChange(
          req as any,
          'UPDATE',
          'config/general',
          'success',
          'Updated general settings'
        );
      }

      return res.json({ success: true, message: 'General settings updated and persisted' });
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
        return res.status(400).json({
          error: `Invalid configName '${configName}'. Must be existing or match 'type-name' pattern. Valid types: ${Object.keys(schemaSources).join(', ')}`,
        });
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
      return res.status(400).json({
        error: 'Invalid config path',
        message: 'Path traversal detected',
      });
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
        req as any,
        'UPDATE',
        `config/${configName}`,
        'success',
        `Updated configuration for ${configName}`
      );
    }

    return res.json({ success: true, message: 'Configuration updated and persisted' });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error) as any;
    return res.status(hivemindError.statusCode || 500).json({
      error: hivemindError.message,
      code: hivemindError.code || 'CONFIG_GLOBAL_PUT_ERROR',
    });
  }
});

// ... (Rest of file)

export default router;
