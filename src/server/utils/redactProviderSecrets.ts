/**
 * Provider config secrets are stored encrypted at rest by webUIStorage
 * (see SecureConfigManager). They must NOT be persisted in a truncated /
 * "sk-***" form — that breaks the saved config silently. Use this helper
 * to redact AFTER persistence, for the response body sent back to the UI.
 */

const SECRET_KEYS = ['apiKey', 'botToken', 'token', 'signingSecret', 'password', 'secret'];

function redactValue(v: unknown): string {
  if (typeof v !== 'string' || v.length === 0) return '***';
  if (v.length <= 4) return '***';
  return v.substring(0, 3) + '***';
}

/**
 * Return a shallow copy of `config` with known secret fields redacted.
 * Pass-through when `config` is nullish or not an object.
 */
export function redactProviderConfig<T extends Record<string, unknown> | undefined | null>(
  config: T
): T {
  if (!config || typeof config !== 'object') return config;
  const out: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  for (const key of SECRET_KEYS) {
    if (key in out && out[key] != null && out[key] !== '') {
      out[key] = redactValue(out[key]);
    }
  }
  return out as T;
}

/**
 * Return a shallow-cloned provider with its `config` redacted.
 */
export function redactProvider<T extends { config?: Record<string, unknown> | null }>(
  provider: T
): T {
  if (!provider) return provider;
  return { ...provider, config: redactProviderConfig(provider.config) } as T;
}
