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
  const sensitiveKeys = ['password', 'apikey', 'auth_token', 'secret'];
  try {
    if (typeof value !== 'string') {
      return String(value);
    }
    if (sensitiveKeys.includes(key.toLowerCase())) {
      return '********';
    }
    return value;
  } catch (error: unknown) {
    redactDebug(`Error processing value: ${(error as Error).message}`);
    return '********';
  }
}
