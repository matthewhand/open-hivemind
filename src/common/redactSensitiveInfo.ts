import debug from 'debug';
const redactDebug = debug('app:redactSensitiveInfo');

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
