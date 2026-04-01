import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { redactSensitiveInfo } from '../../../common/redactSensitiveInfo';
import { BotConfigurationManager } from '../../../config/BotConfigurationManager';
import { UserConfigStore } from '../../../config/UserConfigStore';
import { BotManager } from '../../../managers/BotManager';
import { providerRegistry } from '../../../registries/ProviderRegistry';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import { ConfigUpdateSchema } from '../../../validation/schemas/configSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { logConfigChange, type AuditedRequest } from '../../middleware/audit';
import { ApiResponse } from '../../utils/apiResponse';
import { configLimiter } from '../../../middleware/rateLimiter';
import {
  broadcastConfigUpdate,
  isPathWithinAllowed,
  isSensitiveKey,
  isValidConfigName,
  redactObject,
  deepCloneSchema,
} from './utils';
import { globalConfigs, schemaSources } from './store';

const debug = Debug('app:server:routes:config:system');
const router = Router();

// GET /api/config/ping - Diagnostic endpoint
router.get('/ping', (req, res) => {
  return res.json(ApiResponse.success({ timestamp: new Date().toISOString() }));
});

// GET /api/config/bots - List all configured bots with redacted secrets
router.get('/bots', async (req, res) => {
  try {
    const botManager = await BotManager.getInstance();
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

// GET /api/config/sources - Config key → source layer mapping via ConfigStore
router.get('/sources', (req, res) => {
  try {
    const { ConfigStore } = require('../../../config/ConfigStore');
    const store = ConfigStore.getInstance();
    const sources = store.getAllSources();
    const layers: string[] = ['env', 'secure', 'provider', 'user', 'profile', 'default'];

    return res.json(ApiResponse.success({ sources, layers }));
  } catch (error: any) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error((hivemindError as any).message, 'CONFIG_SOURCES_ERROR', 500));
  }
});

// GET /api/config/source/:key - Source layer for a single config key
router.get('/source/:key', (req, res) => {
  try {
    const { ConfigStore } = require('../../../config/ConfigStore');
    const store = ConfigStore.getInstance();
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

// PUT /api/config/global - Update global configuration
router.put('/global', configLimiter, validateRequest(ConfigUpdateSchema), async (req, res) => {
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

      broadcastConfigUpdate('global', 'update');
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

    broadcastConfigUpdate('global', 'update', configName);
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

export default router;
