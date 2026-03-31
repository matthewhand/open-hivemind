import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import llmConfig from '../../../config/llmConfig';
import llmTaskConfig from '../../../config/llmTaskConfig';
import messageConfig from '../../../config/messageConfig';
import webhookConfig from '../../../config/webhookConfig';
import { providerRegistry } from '../../registries/ProviderRegistry';
import type { IProvider } from '../../types/IProvider';

const debug = Debug('app:server:routes:config:shared');

export function isValidConfigName(configName: string): boolean {
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

export function isPathWithinAllowed(targetPath: string, allowedBasePath: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(allowedBasePath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

export const coreSchemaSources: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  llmTask: llmTaskConfig,
  webhook: webhookConfig,
};

export let schemaSources: Record<string, any> = { ...coreSchemaSources };
export let globalConfigs: Record<string, any> = { ...schemaSources };

export const loadDynamicConfigs = async () => {
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

export const SENSITIVE_PATTERNS = [/token/i, /key/i, /secret/i, /password/i, /credential/i, /auth/i];

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

export function redactValue(value: any): string {
  if (!value) {
    return '';
  }
  const str = String(value);
  if (str.length <= 8) {
    return '••••••••';
  }
  return str.slice(0, 4) + '••••' + str.slice(-4);
}

export function redactObject(obj: any, parentKey = ''): any {
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

export function redactProviderConfig(config: any, provider: IProvider): any {
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
