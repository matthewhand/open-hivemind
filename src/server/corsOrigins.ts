/**
 * Configurable CORS origin resolution.
 *
 * Replaces the previously hardcoded localhost-only regex in setupMiddleware.
 * Allowed origins come from (in union, not precedence):
 *
 *  1. The localhost fallback — `http://localhost` / `http://127.0.0.1` with
 *     any port is always allowed, preserving the original dev behavior.
 *  2. The `CORS_ORIGIN` env var (documented in .env.sample), with
 *     `CORS_ALLOWED_ORIGINS` accepted as an alias. Both take a single origin
 *     or a comma-separated list; `*` allows every origin.
 *  3. The stored `cors.origins` general setting (config/user-config.json via
 *     UserConfigStore — the flat-key store the Settings UI writes through
 *     `PUT /api/config/global`). Accepts an array of origins or a
 *     comma-separated string.
 *
 * Exact-match (and localhost) origins are reflected with
 * `Access-Control-Allow-Credentials: true`, as before. The `*` wildcard
 * deliberately answers with a literal `*` and *no* credentials header:
 * reflecting arbitrary origins while allowing credentials would let any
 * website ride a logged-in admin's cookies.
 */
import Debug from 'debug';

const debug = Debug('app:corsOrigins');

const LOCALHOST_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** A granted CORS response, or null when the origin is not allowed. */
export interface CorsDecision {
  /** Value for the Access-Control-Allow-Origin header. */
  allowOrigin: string;
  /** Whether to send Access-Control-Allow-Credentials: true. */
  credentials: boolean;
}

/**
 * Normalize a raw origin-list value (comma-separated string or array of
 * strings) into a clean string array. Unknown shapes yield [].
 */
export function parseOriginList(raw: unknown): string[] {
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }
  if (Array.isArray(raw)) {
    return raw
      .filter((origin): origin is string => typeof origin === 'string')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }
  return [];
}

/**
 * Origins persisted via the settings store (`cors.origins` general setting).
 * Read lazily and defensively — CORS must keep working even if the config
 * store cannot be loaded.
 */
function getStoredCorsOrigins(): string[] {
  try {
    // Lazy require so importing this module never drags the config store
    // (and its transitive imports) into contexts that don't need it.

    const { UserConfigStore } = require('@src/config/UserConfigStore');
    const settings = UserConfigStore.getInstance().getGeneralSettings();
    return parseOriginList(settings['cors.origins']);
  } catch (err) {
    debug('Failed to read stored CORS origins (continuing with env/localhost):', err);
    return [];
  }
}

/**
 * The full configured origin list: env (`CORS_ORIGIN`, alias
 * `CORS_ALLOWED_ORIGINS`) plus the stored `cors.origins` setting.
 * Re-evaluated per call so settings changes apply without a restart.
 */
export function getConfiguredCorsOrigins(): string[] {
  return [
    ...parseOriginList(process.env.CORS_ORIGIN),
    ...parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
    ...getStoredCorsOrigins(),
  ];
}

/**
 * Decide how to answer CORS for a request origin.
 *
 * @param origin     The request's Origin header.
 * @param configured Configured origin list; defaults to
 *                   {@link getConfiguredCorsOrigins}.
 */
export function resolveCorsDecision(
  origin: string | undefined,
  configured: string[] = getConfiguredCorsOrigins()
): CorsDecision | null {
  if (!origin) return null;

  // Localhost fallback — always allowed (pre-existing behavior).
  if (LOCALHOST_ORIGIN_REGEX.test(origin)) {
    return { allowOrigin: origin, credentials: true };
  }

  if (configured.includes(origin)) {
    return { allowOrigin: origin, credentials: true };
  }

  if (configured.includes('*')) {
    return { allowOrigin: '*', credentials: false };
  }

  return null;
}
