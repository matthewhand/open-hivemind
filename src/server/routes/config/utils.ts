import path from 'path';
import { WebSocketService } from '../../services/WebSocketService';
import { type IProvider } from '../../../types/IProvider';
import { providerRegistry } from '../../../registries/ProviderRegistry';

export function broadcastConfigUpdate(
  type: 'llm-profiles' | 'memory-profiles' | 'tool-profiles' | 'message-profiles' | 'global',
  action: 'create' | 'update' | 'delete',
  key?: string,
): void {
  try {
    const wsService = WebSocketService.getInstance();
    wsService.broadcastConfigChange({ type, action, key });
  } catch {
    // WebSocket may not be initialised in tests — silently ignore
  }
}

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

const SENSITIVE_PATTERNS = [/token/i, /key/i, /secret/i, /password/i, /credential/i, /auth/i];

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

export const deepCloneSchema = (obj: any): any => {
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
