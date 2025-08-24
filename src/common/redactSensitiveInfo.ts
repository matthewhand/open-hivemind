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
export function redactSensitiveInfo(value: any, key: string): string {
  const sensitivePatterns = ['password', 'apikey', 'api_key', 'auth_token', 'secret', 'token', 'key'];
  try {
    if (typeof value !== 'string') {
      return String(value);
    }
    if (!value || value.trim() === '') {
      return value;
    }
    
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitivePatterns.some(pattern => lowerKey.includes(pattern));
    
    if (isSensitive) {
      return '********';
    }
    return value;
  } catch (error: unknown) {
    redactDebug(`Error processing value: ${(error as Error).message}`);
    return '********';
  }
}
