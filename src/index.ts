// .env is loaded via --env-file=.env in the npm script (before any module init)
import 'reflect-metadata';
import './utils/alias';
import fs from 'fs';
import { createServer } from 'http';
import path from 'path';
import express from 'express';
import { container } from '@src/di/container';
import { RealTimeValidationService } from '@src/server/services/RealTimeValidationService';
import WebSocketService from '@src/server/services/WebSocketService';
import { ShutdownCoordinator } from '@src/server/ShutdownCoordinator';
import AnomalyDetectionService from '@src/services/AnomalyDetectionService';
import Logger from '@common/logger';
import { initServices, initWebhooks } from './server/initServices';
import { registerRoutes } from './server/registerRoutes';
import { setupMiddleware } from './server/setupMiddleware';

const appLogger = Logger.withContext('app:index');
const frontendLogger = Logger.withContext('frontend');

const resolveFrontendDistPath = (): string => {
  const candidates = [
    path.join(process.cwd(), 'dist/client/dist'),
    path.join(process.cwd(), 'src/client/dist'),
  ];

  for (const candidate of candidates) {
    const exists = fs.existsSync(candidate);
    frontendLogger.debug('Evaluating frontend dist path candidate', { candidate, exists });
    if (exists) {
      frontendLogger.debug('Using frontend dist path', { candidate });
      return candidate;
    }
  }

  const fallback = candidates[candidates.length - 1];
  frontendLogger.warn('No frontend dist path matched; using fallback', { fallback });
  return fallback;
};

const frontendDistPath = resolveFrontendDistPath();
const frontendAssetsPath = path.join(frontendDistPath, 'assets');

// Vite Dev Server Instance (only used in dev)

const viteServerRef: { current: any } = { current: undefined };

// Check if frontend dist exists (async check will be done in main())
const frontendDistExists = fs.existsSync(frontendDistPath);

// Initialize ShutdownCoordinator for graceful shutdown
const shutdownCoordinator = ShutdownCoordinator.getInstance();

const app = express();

// ── Middleware ──
setupMiddleware(app, { frontendDistPath, frontendAssetsPath, viteServerRef });

// ── Routes ──
registerRoutes(app, { frontendDistPath, viteServerRef });

async function main(): Promise<void> {
  // ── Services (DI, DB, providers, messengers, pipeline) ──
  const { messengerServices } = await initServices(app);

  const httpEnabled = process.env.HTTP_ENABLED !== 'false';
  if (httpEnabled) {
    const port = parseInt(process.env.PORT || '3028', 10);
    const server = createServer(app);

    // Register background services for graceful shutdown
    const rtvs = RealTimeValidationService.getInstance();
    if (rtvs && typeof rtvs.shutdown === 'function') {
      shutdownCoordinator.registerService({
        name: 'RealTimeValidationService',
        shutdown: () => {
          appLogger.info('🛑 Healthcheck: Shutting down RealTimeValidationService...');
          rtvs.shutdown();
        },
      });
    }

    const ads = AnomalyDetectionService.getInstance();
    if (ads && typeof ads.shutdown === 'function') {
      shutdownCoordinator.registerService({
        name: 'AnomalyDetectionService',
        shutdown: () => {
          appLogger.info('🛑 Healthcheck: Shutting down AnomalyDetectionService...');
          ads.shutdown();
        },
      });
    }

    const { ApiMonitorService } = await import('@src/services/ApiMonitorService');
    const ams = container.resolve(ApiMonitorService);
    shutdownCoordinator.registerService({
      name: 'ApiMonitorService',
      shutdown: () => {
        appLogger.info('🛑 Healthcheck: Shutting down ApiMonitorService...');
        ams.shutdown();
      },
    });

    // Register HTTP server with ShutdownCoordinator
    shutdownCoordinator.registerHttpServer(server);

    // Initialize Vite in Development Mode (with HMR)
    const enableViteDev = process.env.ENABLE_VITE_DEV !== 'false';
    if (process.env.NODE_ENV === 'development' && enableViteDev) {
      // @ts-ignore - Vite is a dev dependency using dynamic import
      const viteModule = await new Function('return import("vite")')();
      const createViteServer = viteModule.createServer;
      appLogger.info('⚡ Starting Vite Middleware for Hot Reloading...');
      viteServerRef.current = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { server }, // Pass the http server to Vite for HMR
        },
        appType: 'custom',
        configFile: path.join(process.cwd(), 'src/client/vite.config.ts'),
        root: path.join(process.cwd(), 'src/client'),
      });

      // Register Vite server with ShutdownCoordinator
      shutdownCoordinator.registerViteServer(viteServerRef.current);

      appLogger.info('⚡ Vite Middleware Active');
    }

    if (process.env.NODE_ENV === 'development' && !enableViteDev) {
      app.get('/', (req: express.Request, res: express.Response) => {
        res
          .status(200)
          .set({ 'Content-Type': 'text/html' })
          .send(
            '<!doctype html><html><head><title>Open Hivemind</title></head><body><h1>Open Hivemind</h1><p>Development mode without Vite. Build the frontend to view the full WebUI.</p></body></html>'
          );
      });
    }

    // Initialize WebSocket service
    const wsService = WebSocketService.getInstance();
    wsService.initialize(server);

    server.on('error', (err) => {
      appLogger.error('HTTP server error', { error: err });
    });

    appLogger.info('🌐 Starting HTTP server', { port, host: '0.0.0.0' });
    server.listen(port, '0.0.0.0', () => {
      appLogger.info('✅ HTTP server listening', { port });
      appLogger.info('🔌 WebSocket service ready', { endpoint: '/webui/socket.io' });
      appLogger.info('🌍 WebUI available', { url: `http://localhost:${port}` });
      appLogger.info('📡 API endpoints available', { baseUrl: `http://localhost:${port}/api` });

      if (frontendDistExists) {
        appLogger.info('📱 Frontend assets served from', { path: frontendDistPath });
      } else {
        appLogger.warn(
          '⚠️  Frontend build not found - attempting auto-build via `pnpm run build:frontend`'
        );
        // SECURITY: Command injection safe - using execFile() with argument array.
        // execFile() does not spawn a shell, so arguments are passed directly to pnpm.
        // No user input is involved - command and args are hardcoded.
        const { execFile } = require('child_process');
        execFile(
          'pnpm',
          ['run', 'build:frontend'],
          { cwd: process.cwd() },
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) {
              appLogger.warn(
                '⚠️  Auto-build failed (devDependencies may be pruned in production). Run `pnpm run build:frontend` manually.',
                { error: err.message }
              );
            } else {
              appLogger.info('✅ Frontend auto-build succeeded', { stdout: stdout.trim() });
            }
            if (stderr) appLogger.debug('build:frontend stderr', { stderr: stderr.trim() });
          }
        );
      }
    });
  } else {
    appLogger.info('🔌 HTTP server is disabled via configuration');
  }

  // ── Webhooks ──
  await initWebhooks(app, messengerServices);

  // Print legend for decision logs
  const { default: StartupLegendService } = await import('./services/StartupLegendService');
  StartupLegendService.printLegend();

  // Setup signal handlers for graceful shutdown
  shutdownCoordinator.setupSignalHandlers();

  // Startup complete
  appLogger.info('🎉 Open Hivemind Server startup complete!');

  // Re-print temp password so it's visible after all startup noise
  const { AuthManager } = await import('./auth/AuthManager');
  const generatedPwd = AuthManager.getInstance().getGeneratedPassword();
  if (generatedPwd) {
    appLogger.warn('================================================================');
    appLogger.warn('⚠️  REMINDER: Temporary admin password (set ADMIN_PASSWORD to remove this):');
    appLogger.warn(`   Username: admin`);
    appLogger.warn(`   Password: ${generatedPwd}`);
    appLogger.warn('================================================================');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    appLogger.error('Unexpected error in main execution', { error });
    // Use ShutdownCoordinator for graceful shutdown instead of hard exit
    const coordinator = ShutdownCoordinator.getInstance();
    coordinator.initiateShutdown('main_error', 1).catch((shutdownError) => {
      appLogger.error('Error during shutdown after main failure', { shutdownError });
      process.exit(1);
    });
  });
}

export { main };
export default app;
