import debug from 'debug';

const redactDebug = debug('app:redactSensitiveInfo');

/**
 * Redacts sensitive information from values based on key patterns
 * @param key - The key name to check for sensitivity
 * @param value - The value to potentially redact
 * @returns Original value if non-sensitive, redacted string '********' if sensitive
 * @example
 * // Returns '********'
 * redactSensitiveInfo('password', 'mySecret123')
 * @example
 * // Returns 'publicValue'
 * redactSensitiveInfo('username', 'admin')
 */
export function redactSensitiveInfo(key: string, value: any): string {
  const sensitivePatterns = [
    'password',
    'apikey',
    'api_key',
    'auth_token',
    'secret',
    'token',
    'key',
  ];
  try {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitivePatterns.some((pattern) => lowerKey.includes(pattern));

    if (!isSensitive) {
      return value === undefined || value === null ? '' : String(value);
    }

    const stringValue = value === undefined || value === null ? '' : String(value);
    if (stringValue.length === 0) {
      return '********';
    }

    if (stringValue.length <= 8) {
      const visible = stringValue.slice(-4);
      const redactionLength = Math.max(stringValue.length - visible.length, 4);
      return `${'*'.repeat(redactionLength)}${visible}`;
    }

    const start = stringValue.slice(0, 4);
    const end = stringValue.slice(-4);
    const middleLength = Math.max(stringValue.length - 8, 4);
    return `${start}${'*'.repeat(middleLength)}${end}`;
  } catch (error: unknown) {
    redactDebug(`Error processing value: ${(error as Error).message}`);
    return '********';
  }
}
