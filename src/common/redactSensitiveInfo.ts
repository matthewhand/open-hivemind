const redactDebug = require('debug')('app:redactSensitiveInfo');

function redactSensitiveInfo(key: string, value: any): string {
  const sensitiveKeys = ['password', 'apiKey', 'auth_token', 'secret', 'key'];
  const sensitiveValuePatterns = ['Bearer', 'Token'];

  try {
    // If value is not a string, return a simple string representation
    if (typeof value !== 'string') {
      return `${key}: [Object]`;
    }

    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      return `${key}: ${value.slice(0, 5)}...${value.slice(-5)}`;
    }

    for (const pattern of sensitiveValuePatterns) {
      if (value.startsWith(pattern)) {
        const parts = value.split(' ');
        const secret = parts[1] || '';
        return `${key}: ${pattern} ${secret.slice(0, 5)}...${secret.slice(-5)}`;
      }
    }

    return `${key}: ${value}`;
  } catch (error: unknown) {
    redactDebug(`Error stringifying value: ${(error as Error).message}`);
    return `${key}: [Redacted due to error]`;
  }
}

module.exports = redactSensitiveInfo;
