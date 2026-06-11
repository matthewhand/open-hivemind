/**
 * Serverless Express app factory.
 *
 * Builds the same Express app as src/index.ts (middleware + all API routes)
 * WITHOUT calling listen() and WITHOUT starting anything that assumes a
 * long-lived process: no messenger services, no WebSocket server, no Vite
 * middleware, and no background interval services (heartbeats, schedulers,
 * anomaly detection, MCP auto-connect, webhooks).
 *
 * Intended for stateless preview deployments (Netlify Functions / Vercel
 * Functions) where the built WebUI is served from the CDN and only /api/*
 * and /health are routed to this app. The app boots in demo mode
 * (DEMO_MODE=true, SKIP_MESSENGERS=true) so the admin dashboard renders
 * with simulated data.
 *
 * Known limitations on serverless:
 *   - No WebSockets (the WebUI falls back to polling where supported).
 *   - SQLite persistence writes to /tmp and does not survive cold starts.
 *   - Ephemeral generated secrets mean sessions/JWTs reset on cold starts
 *     unless SESSION_SECRET / JWT_SECRET / JWT_REFRESH_SECRET are configured.
 */
import 'reflect-metadata';
import crypto from 'crypto';
import express from 'express';
import { container } from '@src/di/container';
import { registerServices } from '@src/di/registration';
import type DemoModeService from '@src/services/DemoModeService';
import Logger from '@common/logger';
import { registerRoutes } from './registerRoutes';
import { setupMiddleware } from './setupMiddleware';

const appLogger = Logger.withContext('app:serverless');

/**
 * Apply environment defaults suitable for a stateless preview function.
 * Every assignment respects an explicitly configured value, so real
 * deployments can override any of these via platform env vars.
 */
export function applyServerlessEnvDefaults(): void {
  // Serverless previews never run messengers or websockets.
  process.env.SKIP_MESSENGERS = process.env.SKIP_MESSENGERS ?? 'true';
  process.env.DEMO_MODE = process.env.DEMO_MODE ?? 'true';

  // No long-lived process: disable interval-based services defensively.
  process.env.ANOMALY_DETECTION_ENABLED = process.env.ANOMALY_DETECTION_ENABLED ?? 'false';
  process.env.DISABLE_INTEGRATION_ANOMALY = process.env.DISABLE_INTEGRATION_ANOMALY ?? 'true';

  // /tmp is the only writable directory on Lambda-style runtimes.
  process.env.DATABASE_PATH = process.env.DATABASE_PATH ?? '/tmp/hivemind.db';

  // Requests arrive via the platform's proxy with arbitrary client IPs;
  // the localhost-oriented admin IP guard would reject everything.
  process.env.HTTP_ALLOW_ALL_IPS = process.env.HTTP_ALLOW_ALL_IPS ?? 'true';

  // Stateless previews: generate ephemeral secrets when none are configured
  // so auth bootstraps instead of refusing to start. Tokens signed with
  // these do not survive cold starts — configure real secrets to fix that.
  for (const key of ['SESSION_SECRET', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (!process.env[key] || process.env[key]!.trim().length < 32) {
      process.env[key] = crypto.randomBytes(32).toString('hex');
    }
  }
}

/**
 * Initialize the minimal set of backend services the API routes need.
 * Mirrors the non-timer portions of initServices(); every step degrades
 * gracefully so a missing native module (e.g. better-sqlite3 on a
 * serverless runtime) only disables persistence instead of killing boot.
 */
async function initServerlessServices(): Promise<void> {
  registerServices();

  try {
    const { UserConfigStore } = await import('@src/config/UserConfigStore');
    await UserConfigStore.getInstance().loadConfig();
  } catch (error) {
    appLogger.warn('User configuration unavailable in serverless mode', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const { DatabaseManager } = await import('@src/database/DatabaseManager');
    const dbManager = DatabaseManager.getInstance();
    dbManager.configure({ type: 'sqlite', path: process.env.DATABASE_PATH || '/tmp/hivemind.db' });
    await dbManager.connect();
    appLogger.info('Serverless database connected', { path: process.env.DATABASE_PATH });
  } catch (error) {
    appLogger.warn('Database unavailable in serverless mode (persistence disabled)', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const { BotConfigurationManager } = await import('@src/config/BotConfigurationManager');
    await BotConfigurationManager.getInstance().loadConfiguration();
  } catch (error) {
    appLogger.warn('Bot configuration load failed in serverless mode', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const { reloadGlobalConfigs } = await import('./routes/config');
    await reloadGlobalConfigs();
  } catch (error) {
    appLogger.warn('Global config reload failed in serverless mode', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Demo mode service powers the dashboard's simulated bots/activity.
  try {
    const demoService = container.resolve<DemoModeService>('DemoModeService');
    await demoService.initialize();
    appLogger.info('Serverless demo mode', { active: demoService.isInDemoMode() });
  } catch (error) {
    appLogger.warn('Demo mode initialization failed in serverless mode', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Build the Express app (middleware + routes) and initialize services.
 * Does NOT call listen(). Safe to wrap with serverless-http or to invoke
 * directly as a Node request handler.
 */
export async function createServerlessApp(): Promise<express.Application> {
  applyServerlessEnvDefaults();

  const app = express();

  // The SPA is served by the platform CDN; these paths only matter for the
  // rarely-hit catch-all handlers, which degrade to a 404 when absent.
  const frontendDistPath = `${process.cwd()}/src/client/dist`;
  const frontendAssetsPath = `${frontendDistPath}/assets`;
  const viteServerRef: { current: undefined } = { current: undefined };

  setupMiddleware(app, { frontendDistPath, frontendAssetsPath, viteServerRef });
  registerRoutes(app, { frontendDistPath, viteServerRef });

  await initServerlessServices();

  appLogger.info('Serverless app initialized');
  return app;
}

let appPromise: Promise<express.Application> | null = null;

/**
 * Memoized accessor — serverless runtimes reuse the module between warm
 * invocations, so the app (and its service init) is built exactly once
 * per container.
 */
export function getServerlessApp(): Promise<express.Application> {
  if (!appPromise) {
    appPromise = createServerlessApp().catch((error) => {
      // Allow a later invocation to retry instead of caching the failure.
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}
