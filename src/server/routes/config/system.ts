import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router } from 'express';
import { redactSensitiveInfo } from '../../../common/redactSensitiveInfo';
import { BotConfigurationManager } from '../../../config/BotConfigurationManager';
import llmConfig from '../../../config/llmConfig';
import llmTaskConfig from '../../../config/llmTaskConfig';
import messageConfig from '../../../config/messageConfig';
import { UserConfigStore } from '../../../config/UserConfigStore';
import webhookConfig from '../../../config/webhookConfig';
import { BotManager } from '../../../managers/BotManager';
import { providerRegistry } from '../../../registries/ProviderRegistry';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';
import { type IProvider } from '../../../types/IProvider';
import { ConfigUpdateSchema } from '../../../validation/schemas/configSchema';
import { validateRequest } from '../../../validation/validateRequest';
import { auditMiddleware, logConfigChange, type AuditedRequest } from '../../middleware/audit';
import { ApiResponse } from '../../utils/apiResponse';

const debug = Debug('app:server:routes:config:system');
const router = Router();

function isValidConfigName(configName: string): boolean {
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

function isPathWithinAllowed(targetPath: string, allowedBasePath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(allowedBasePath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

const coreSchemaSources: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  llmTask: llmTaskConfig,
  webhook: webhookConfig,
};

export let schemaSources: Record<string, any> = { ...coreSchemaSources };
export let globalConfigs: Record<string, any> = { ...schemaSources };

const loadDynamicConfigs = async () => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const providersDir = path.join(configDir, 'providers');

    try {
      const files = await fs.promises.readdir(providersDir);

      files.forEach((file) => {
        const match = file.match(/^([a-z]+)-(.+)\.json$/);
        if (match) {
          const type = match[1];
          const name = match[0].replace('.json', '');

          if (schemaSources[type] && !globalConfigs[name]) {
            debug(`Loading dynamic config: ${name} (type: ${type})`);
            const convict = require('convict');
            const newConfig = convict(schemaSources[type].getSchema());

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
    } catch (e: any) {
      if ((e as any).code !== 'ENOENT') {
        throw e;
      }
    }
  } catch (e) {
    console.error('Failed to load dynamic configs:', e);
  }
};

export const reloadGlobalConfigs = async () => {
  const providers = providerRegistry.getAll();
  providers.forEach((p) => {
    schemaSources[p.id] = p.getConfig();
  });

  globalConfigs = { ...schemaSources };
  await loadDynamicConfigs();

  debug(
    'Global configs reloaded with providers:',
    providers.map((p) => p.id)
  );
};

if (process.env.NODE_ENV !== 'test') {
  router.use(auditMiddleware);
}

router.get('/ping', (req, res) => {
  return res.json(ApiResponse.success({ timestamp: new Date().toISOString() }));
});

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
      result[key] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

router.get('/bots', async (req, res) => {
  try {
    const botManager = BotManager.getInstance();
    const bots = await botManager.getAllBots();
    const manager = BotConfigurationManager.getInstance();

    const safeBots = bots.map((bot: any) => {
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

router.get('/global', (req, res) => {
  try {
    const response: Record<string, any> = {};

    Object.entries(globalConfigs).forEach(([key, config]) => {
      const props = config.getProperties();
      const schema = deepCloneSchema(config.getSchema());
      const properties = schema.properties || schema;

      for (const propKey in properties) {
        const prop = properties[propKey];
        if (typeof prop === 'object' && prop !== null) {
          if (prop.env && process.env[prop.env] !== undefined && process.env[prop.env] !== '') {
            prop.locked = true;
          }
        }
      }

      const redactedProps = structuredClone(props);
      const provider = providerRegistry.get(key);

      if (provider) {
        const sensitive = new Set(provider.getSensitiveKeys());
        for (const k in redactedProps) {
          if (sensitive.has(k)) {
            redactedProps[k] = '********';
          }
        }
      } else {
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

    const userConfigStore = UserConfigStore.getInstance();
    const generalSettings = userConfigStore.getGeneralSettings();
    if (Object.keys(generalSettings).length > 0) {
      response._userSettings = {
        values: generalSettings,
        schema: null,
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
    if (schemaSources[configName] && !createdNew) {
      targetFile = `providers/${configName}.json`;
    } else {
      targetFile = `providers/${configName}.json`;
    }

    const targetPath = path.join(configDir, targetFile);

    if (!isPathWithinAllowed(targetPath, configDir)) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(ApiResponse.error('Invalid config path', undefined, 400));
    }

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

export default router;
