/**
 * Serverless filesystem bootstrap — MUST be imported before any app/route
 * module so it runs before their module-load side effects.
 *
 * Several managers create config/data/log directories in their constructors
 * (e.g. ProviderConfigManager, webUIStorage, auditLogger, PerformanceProfiler),
 * resolving paths from `__dirname`, `process.cwd()`, or `NODE_CONFIG_DIR`. On
 * Lambda-style runtimes (Netlify/Vercel functions) the deploy directory is
 * READ-ONLY and only `/tmp` is writable, so those `mkdirSync` calls crash the
 * function at cold start (`ENOENT: mkdir 'config/...'`) and 502 the whole API.
 *
 * This module — imported first by serverlessApp.ts — points every writable
 * path at a `/tmp` base and chdir's there, so both `cwd`-relative and
 * `NODE_CONFIG_DIR`-based writes land in writable space. It is a no-op off
 * serverless, and every assignment respects an explicitly-configured value.
 *
 * applyServerlessEnvDefaults() (in serverlessApp.ts) still sets the non-path
 * defaults (DEMO_MODE, SKIP_MESSENGERS, secrets) which are read later and so
 * don't need this pre-import timing.
 */
import fs from 'fs';
import crypto from 'crypto';

const isServerless = !!(
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.VERCEL ||
  process.env.NETLIFY
);

if (isServerless) {
  const base = process.env.OH_SERVERLESS_BASE || '/tmp/open-hivemind';
  // EncryptionService throws FATAL at module load when NODE_ENV=production and
  // no key is set (Vercel sets NODE_ENV=production). Mint an ephemeral key for
  // the stateless demo (the /tmp DB is wiped on cold start anyway); any value
  // works (it is sha256-normalized). A real configured key always wins.
  process.env.DATABASE_ENCRYPTION_KEY =
    process.env.DATABASE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  // AuthManager (and friends) likewise throw CRITICAL at module load when
  // NODE_ENV=production and these are unset. applyServerlessEnvDefaults() mints
  // them too, but that runs after AuthMiddleware has already loaded — so mint
  // them here (pre-import) as well. Real configured secrets always win.
  // JWT_SECRET/JWT_REFRESH_SECRET/SESSION_SECRET (AuthManager), ADMIN_PASSWORD
  // (AuthManager.initializeDefaultAdminSync), and HIVEMIND_PLUGIN_SIGNING_KEY
  // (PluginManager) all throw CRITICAL at module load under NODE_ENV=production.
  // A random ADMIN_PASSWORD means the public demo has no usable admin login by
  // design (browse-only); set a real one to enable login.
  for (const key of [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
    'ADMIN_PASSWORD',
    'HIVEMIND_PLUGIN_SIGNING_KEY',
  ] as const) {
    if (!process.env[key] || process.env[key]!.trim().length < 32) {
      process.env[key] = crypto.randomBytes(32).toString('hex');
    }
  }
  try {
    for (const sub of ['', '/config', '/config/providers', '/config/user', '/data', '/uploads', '/logs']) {
      fs.mkdirSync(`${base}${sub}`, { recursive: true });
    }
    // __dirname/NODE_CONFIG_DIR-based managers (e.g. ProviderConfigManager).
    process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || `${base}/config`;
    process.env.DATABASE_PATH = process.env.DATABASE_PATH || `${base}/data/hivemind.db`;
    process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || `${base}/uploads`;
    // cwd-relative writers (webUIStorage, auditLogger, PerformanceProfiler).
    process.chdir(base);
  } catch {
    // Best-effort: individual managers keep their own fallbacks; never let the
    // bootstrap itself throw at module load.
  }
}
