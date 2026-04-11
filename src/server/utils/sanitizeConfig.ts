/**
 * Redacts sensitive fields in config objects before sending to clients.
 * Replaces the value with a masked string so the UI knows a value exists
 * without revealing the actual secret.
 */

const SENSITIVE_KEYS = new Set([
  'apiKey',
  'api_key',
  'apikey',
  'password',
  'passwd',
  'secret',
  'clientSecret',
  'client_secret',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'privateKey',
  'private_key',
  'webhookSecret',
  'webhook_secret',
]);

export function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (SENSITIVE_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
      result[key] = '••••••••'; // Fixed mask — reveals nothing about key length or prefix
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeConfig(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function sanitizeProfiles(profiles: any[]): any[] {
  return profiles.map((profile) => ({
    ...profile,
    config: profile.config ? sanitizeConfig(profile.config) : profile.config,
  }));
}
