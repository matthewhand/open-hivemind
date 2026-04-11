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
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vite dev server type is dynamic
const viteServerRef: { current: any } = { current: undefined };

// Check if frontend dist exists (async check will be done in main())
let frontendDistExists = fs.existsSync(frontendDistPath);

// Initialize ShutdownCoordinator for graceful shutdown
const shutdownCoordinator = ShutdownCoordinator.getInstance();

// Unhandled rejection and uncaught exception handlers are registered by
// ShutdownCoordinator.setupSignalHandlers() (called below) — do not register
// them here a second time to avoid duplicate listeners.

const app = express();

// ── Middleware ──
setupMiddleware(app, { frontendDistPath, frontendAssetsPath, viteServerRef });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware
app.use(applyRateLimiting);

// CORS middleware for localhost development
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const isLocalhost =
    origin?.includes('localhost') ||
    origin?.includes('127.0.0.1') ||
    req.hostname === 'localhost' ||
    req.hostname === '127.0.0.1';

  if (isLocalhost) {
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-CSRF-Token'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  }

  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  // Suppress noisy health checks by default, but allow override via SUPPRESS_HEALTH_LOGS
  const suppressHealthLogs = process.env.SUPPRESS_HEALTH_LOGS !== 'false';
  if (req.path === '/health' || req.path === '/api/health') {
    if (!suppressHealthLogs) {
      httpLogger.debug('Incoming request', { method: req.method, path: req.path });
    }
  } else {
    httpLogger.debug('Incoming request', { method: req.method, path: req.path });
  }

  // Security headers
  // SECURITY: See src/server/middleware/security.ts for detailed CSP explanation
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const workerSrc =
    process.env.NODE_ENV === 'development' ? "worker-src 'self' blob:;" : "worker-src 'none';";
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'none'; ${workerSrc}`
  );

  next();
});
// app.use(healthRoute); // Removed global mount causing root conflict

// Serve dashboard at root
if (process.env.NODE_ENV !== 'development') {
  app.get('/', async (req: Request, res: Response) => {
    const indexPath = path.join(frontendDistPath, 'index.html');
    appLogger.debug('Handling root request for frontend shell', { frontendDistPath, indexPath });

    try {
      await fs.promises.access(indexPath);
      appLogger.debug('Serving frontend index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          appLogger.error('Error sending frontend file', { error: err });
          res.status(500).send('Error serving frontend');
        } else {
          appLogger.info('Frontend served successfully');
        }
      });
    } catch {
      appLogger.error('Frontend index.html not found', { indexPath });
      res.status(404).send('Frontend not found - please run pnpm run build:frontend');
    }
  });
}

// Serve static files from webui dist directory
// Serve static files from webui dist directory (Production Only)
if (process.env.NODE_ENV !== 'development') {
  app.use(express.static(frontendDistPath));
  // Global assets static for root-relative asset paths
  app.use('/assets', express.static(frontendAssetsPath));

  // Uber UI (dashboard)
  app.use('/uber', express.static(frontendDistPath));
  app.use('/uber/*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Development Mode Handlers - Proxy to Vite

  // Config for HTML serving
  const serveDevHtml = async (req: Request, res: Response) => {
    try {
      const url = req.originalUrl;
      let template = await fs.promises.readFile(
        path.join(process.cwd(), 'src/client/index.html'),
        'utf-8'
      );
      template = await viteServer.transformIndexHtml(url, template);
      res
        .status(200)
        .set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        })
        .end(template);
    } catch (e: unknown) {
      if (e instanceof Error) {
        viteServer.ssrFixStacktrace(e);
      }
      appLogger.error('Vite SSR Error', e);
      res.status(500).end(e instanceof Error ? e.message : String(e));
    }
  };

  app.get('/', serveDevHtml);
  app.get('/login', serveDevHtml);
  app.get('/dashboard', serveDevHtml);
  app.get('/activity', serveDevHtml);
  app.get('/uber/*', serveDevHtml);
  app.get('/admin/*', serveDevHtml);
  app.get('/webui/*', serveDevHtml);
}

// ─────────────────────────────────────────────────────────────────────────────
// IP Filtering Security (when auth is disabled)
// ─────────────────────────────────────────────────────────────────────────────
const allowAllIPs = process.env.HTTP_ALLOW_ALL_IPS === 'true';
if (!allowAllIPs) {
  appLogger.info(
    '🔒 IP filtering ENABLED for /api/* routes (set HTTP_ALLOW_ALL_IPS=true to disable)'
  );
  app.use('/api', ipWhitelist);
} else {
  appLogger.warn('⚠️  IP filtering DISABLED (HTTP_ALLOW_ALL_IPS=true)');
}

// CSRF token endpoint
app.get('/api/csrf-token', csrfTokenHandler);

// API routes - all on same port, no separation
app.use('/api/activity', activityRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/swarm', authenticateToken, swarmRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/config', webuiConfigRouter);
app.use('/api/bots', botsRouter);
app.use('/api/bot-config', botConfigRouter);
app.use('/api/validation', validationRouter);
app.use('/api/hot-reload', hotReloadRouter);
app.use('/api/ci', ciRouter);
app.use('/api/enterprise', enterpriseRouter);
app.use('/api/errors', errorsRouter);
app.use('/api/secure-config', secureConfigRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminApiRouter);
app.use('/api/anomalies', authenticateToken, anomalyRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/letta', lettaRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/mcp-tools', mcpToolsRouter);
app.use('/api/guards', authenticateToken, guardsRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/docs', apiDocsRouter);
app.use('/api', openapiRouter);
app.use('/api/pluginSecurity', pluginSecurityRouter);
app.use('/api/specs', authenticateToken, specsRouter);
app.use('/api/import-export', authenticateToken, importExportRouter);
app.use('/api/personas', personasRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/usage-tracking', usageTrackingRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/webui', webuiRouter);
app.use('/api/demo', demoRouter); // Demo mode routes
app.use('/api/health', healthRoute); // Health API endpoints
app.use('/health', healthRoute);

app.use(sitemapRouter); // Sitemap routes at root level

// Legacy route redirects - everything now under /
app.use('/webui', (req: Request, res: Response) => res.redirect(301, '/' + req.path));
app.get('/admin*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// React Router catch-all handler (must be AFTER all API routes)
// Serve index.html for all non-API, non-asset routes so React Router handles them
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // Skip API routes and static assets
  if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.includes('.')) {
    return next();
  }
  if (process.env.NODE_ENV === 'development' && viteServer) {
    // In dev mode, serve through Vite's HTML transform
    const url = req.originalUrl;
    fs.promises
      .readFile(path.join(process.cwd(), 'src/client/index.html'), 'utf-8')
      .then((template) => viteServer.transformIndexHtml(url, template))
      .then((html) => {
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      })
      .catch((e: unknown) => {
        if (e instanceof Error) viteServer.ssrFixStacktrace(e);
        next(e);
      });
  } else {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  }
});

// Vite Proxy Middleware for Development (Must be before 404 handler)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development' && viteServer) {
    viteServer.middlewares(req, res, next);
  } else {
    next();
  }
});
// Return 404 for all non-existent routes
app.get('*', (req: Request, res: Response) => {
  httpLogger.debug('No matching route for request', { path: req.path });
  res.status(404).json({ error: 'Endpoint not found' });
});

async function startBot(messengerService: any) {
  const providerType =
    messengerService.providerName || messengerService.constructor?.name || 'Unknown';

  try {
    const messageHandlerModule = await import('@message/handlers/messageHandler');
    debugEnvVarsModule.debugEnvVars();
    indexLog('[DEBUG] Starting bot initialization...');
    if (typeof messengerService.setApp === 'function') {
      messengerService.setApp(app);
    }
    await messengerService.initialize();
    indexLog('[DEBUG] Bot initialization completed.');
    indexLog('[DEBUG] Setting up message handler...');

    // Initialize idle response manager
    const idleResponseManager = IdleResponseManager.getInstance();
    await idleResponseManager.initialize();

    if (process.env.USE_LEGACY_HANDLER !== 'true') {
      // Pipeline mode: emit onto the MessageBus so the 5-stage pipeline
      // (Receive → Decision → Enrich → Inference → Send) processes the message.
      const { MessageBus } = await import('@src/events/MessageBus');
      const bus = MessageBus.getInstance();
      messengerService.setMessageHandler(
        async (message: any, historyMessages: any[], botConfig: any) => {
          await bus.emitAsync('message:incoming', {
            message,
            history: historyMessages,
            botConfig,
            botName: String(botConfig.BOT_NAME || botConfig.name || 'hivemind'),
            platform: message.platform || 'unknown',
            channelId: message.getChannelId?.() || '',
            metadata: {},
          });
          return ''; // Response is sent by SendStage
        }
      );
    } else {
      // Legacy mode: call handleMessage() directly
      messengerService.setMessageHandler((message: any, historyMessages: any[], botConfig: any) =>
        messageHandlerModule.handleMessage(message, historyMessages, botConfig)
      );
    }
    indexLog('[DEBUG] Message handler set up successfully.');

    // Operator-friendly startup summary (INFO-level).
    // By default we only log a preview of the system prompt to avoid accidental leakage; set
    // STARTUP_LOG_SYSTEM_PROMPT=full to print it verbatim.
    try {
      const mode = String(process.env.STARTUP_LOG_SYSTEM_PROMPT || 'preview').toLowerCase();
      const maxPreview = Number(process.env.STARTUP_LOG_SYSTEM_PROMPT_PREVIEW_CHARS || 280);
      const summaries =
        typeof messengerService.getAgentStartupSummaries === 'function'
          ? messengerService.getAgentStartupSummaries()
          : [];

      const renderPrompt = (p: string | undefined) => {
        const text = String(p || '').trim();
        if (!text) {
          return { systemPromptMode: 'off', systemPromptPreview: '', systemPromptLength: 0 };
        }
        if (mode === 'off') {
          return {
            systemPromptMode: 'off',
            systemPromptPreview: '',
            systemPromptLength: text.length,
          };
        }
        if (mode === 'full') {
          return { systemPromptMode: 'full', systemPrompt: text, systemPromptLength: text.length };
        }
        const preview = text.length > maxPreview ? `${text.slice(0, maxPreview)}…` : text;
        return {
          systemPromptMode: 'preview',
          systemPromptPreview: preview,
          systemPromptLength: text.length,
        };
      };

      for (const s of summaries) {
        const promptInfo = renderPrompt(s.systemPrompt);
        appLogger.info('🤖 Bot instance', {
          name: s.name,
          provider: s.provider,
          botId: s.botId,
          messageProvider: s.messageProvider,
          llmProvider: s.llmProvider,
          llmModel: s.llmModel,
          llmEndpoint: s.llmEndpoint,
          ...promptInfo,
        });
      }
    } catch (e) {
      appLogger.warn('Failed to log bot startup summaries', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    // Log successful provider initialization
    startupDiagnostics.logProviderInitialized(providerType, {
      providerName: messengerService.providerName,
      hasDefaultChannel: !!messengerService.getDefaultChannel?.(),
      channelCount: messengerService.getChannels?.()?.length || 0,
    });

    // Send Welcome Message if enabled
    const enableWelcome = process.env.ENABLE_WELCOME_MESSAGE === 'true';
    if (enableWelcome) {
      const defaultChannel = messengerService.getDefaultChannel
        ? messengerService.getDefaultChannel()
        : null;
      if (defaultChannel) {
        const welcomeText =
          process.env.WELCOME_MESSAGE_TEXT ||
          '🤖 System Online: I am now connected and ready to assist.';
        appLogger.info('Sending welcome message', { channel: defaultChannel, text: welcomeText });

        try {
          if (messengerService.sendMessageToChannel) {
            await messengerService.sendMessageToChannel(defaultChannel, welcomeText);
          } else if (messengerService.sendMessage) {
            await messengerService.sendMessage(defaultChannel, welcomeText);
          }
        } catch (err) {
          appLogger.warn('Failed to send welcome message', { error: err });
        }
      }
    }
  } catch (error) {
    indexLog('[ERROR] Error starting bot service:', error);

    // Log provider initialization failure with diagnostics
    startupDiagnostics.logProviderInitializationFailed(providerType, error);

    // Log the error but don't exit the process - we want other bots to continue working
    appLogger.error('Bot initialization failed', { error, providerType });
  }
}

async function main() {
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

main().catch((error) => {
  appLogger.error('Unexpected error in main execution', { error });
  // Use ShutdownCoordinator for graceful shutdown instead of hard exit
  const coordinator = ShutdownCoordinator.getInstance();
  coordinator.initiateShutdown('main_error', 1).catch((shutdownError) => {
    appLogger.error('Error during shutdown after main failure', { shutdownError });
    process.exit(1);
  });
});

export default app;
