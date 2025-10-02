require('dotenv/config');
// In production we rely on compiled output and module-alias mappings (pointing to dist/*)
// In development (ts-node) we instead leverage tsconfig "paths" via tsconfig-paths/register
// which is injected in the nodemon/ts-node execution command. Avoid loading module-alias
// in development because its _moduleAliases in package.json point to dist/, which does not
// exist (or is stale) when running directly from src.
if (process.env.NODE_ENV === 'production') {
    require('module-alias/register');
}
const express = require('express');
// Import Express types for TypeScript
import { Request, Response, NextFunction } from 'express';
const debug = require('debug');
const messengerProviderModule = require('@message/management/getMessengerProvider');
const messageHandlerModule = require('@message/handlers/messageHandler');
const debugEnvVarsModule = require('@config/debugEnvVars');
const messageConfigModule = require('@config/messageConfig');
const webhookConfigModule = require('@config/webhookConfig');
const healthRouteModule = require('./routes/health');
const webhookServiceModule = require('@webhook/webhookService');
import swarmRouter from './admin/swarmRoutes';
import dashboardRouter from '@src/server/routes/dashboard';
import webuiConfigRouter from '@src/webui/routes/config';
import botsRouter from '@src/server/routes/bots';
import botConfigRouter from '@src/server/routes/botConfig';
import validationRouter from '@src/server/routes/validation';
import hotReloadRouter from '@src/server/routes/hotReload';
import ciRouter from '@src/server/routes/ci';
import enterpriseRouter from '@src/server/routes/enterprise';
import secureConfigRouter from '@src/server/routes/secureConfig';
import authRouter from '@src/server/routes/auth';
import adminApiRouter from '@src/server/routes/admin';
import { authenticateToken } from '@src/server/middleware/auth';
import openapiRouter from '@src/server/routes/openapi';
import WebSocketService from '@src/server/services/WebSocketService';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { getLlmProvider } from '@llm/getLlmProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';
import * as vite from 'vite';
import { getWebUIServer } from '@src/server/server';

const resolveFrontendDistPath = (): string => {
    const candidates = [
        path.join(process.cwd(), 'dist/client/dist'),
        path.join(process.cwd(), 'webui/client/dist'),
    ];

    for (const candidate of candidates) {
        console.log(`[DEBUG] Checking frontend path: ${candidate}, exists: ${fs.existsSync(candidate)}`);
        if (fs.existsSync(candidate)) {
            console.log(`[DEBUG] Using frontend path: ${candidate}`);
            return candidate;
        }
    }

    console.log(`[DEBUG] No frontend path found, defaulting to: ${candidates[candidates.length - 1]}`);
    return candidates[candidates.length - 1];
};

const frontendDistPath = resolveFrontendDistPath();
const frontendAssetsPath = path.join(frontendDistPath, 'assets');
const spaIndexPath = path.join(frontendDistPath, 'index.html');

const getIndexPath = (): string | null => {
    if (fs.existsSync(spaIndexPath)) {
        return spaIndexPath;
    }
    const devIndexPath = path.join(process.cwd(), 'webui/client/index.html');
    if (fs.existsSync(devIndexPath)) {
        return devIndexPath;
    }
    return null;
};

// Vite server instance for development
let viteServer: vite.ViteDevServer | null = null;

if (!fs.existsSync(frontendDistPath)) {
    console.warn('[WARN] Frontend dist directory not found at', frontendDistPath);
}

// Add error handling for unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('[ERROR] Uncaught Exception:', error);
    // Application specific logging, throwing an error, or other logic here
    process.exit(1);
});

const indexLog = debug('app:index');
const app = express();
debug("Messenger services are being initialized...");

const healthRoute = healthRouteModule.default || healthRouteModule;
const messageConfig = messageConfigModule.default || messageConfigModule;
const webhookConfig = webhookConfigModule.default || webhookConfigModule;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for localhost development
app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const isLocalhost = origin?.includes('localhost') ||
                       origin?.includes('127.0.0.1') ||
                       req.hostname === 'localhost' ||
                       req.hostname === '127.0.0.1';

    if (isLocalhost) {
        res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-CSRF-Token');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
    }

    next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none';");

    next();
});

// Vite development server middleware
async function setupViteServer() {
    if (process.env.NODE_ENV === 'development') {
        console.log('[DEBUG] Using Vite dev server middleware');
        viteServer = await vite.createServer({
            server: { middlewareMode: true },
            appType: 'custom',
            root: path.join(process.cwd(), 'webui', 'client'),
        });
        app.use(viteServer.middlewares);
        console.log('[DEBUG] Vite middlewares added to Express app');
    }
}

app.use(healthRoute);

// Serve unified dashboard at root
app.get('/', (req: Request, res: Response) => {
    console.log('[DEBUG] Root route hit - serving React app');
    const indexPath = getIndexPath();
    if (indexPath) {
        return res.sendFile(indexPath);
    }
    res.status(500).send('React app build not found');
});

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve static files from webui dist directory
app.use(express.static(frontendDistPath));

// Global assets static for root-relative asset paths
app.use('/assets', express.static(frontendAssetsPath));

// Uber UI (unified dashboard)
let uberDeprecationLogged = false;
app.use('/uber', (req: Request, res: Response) => {
    if (!uberDeprecationLogged) {
        console.warn('[DEPRECATION] /uber namespace is deprecated. Please use /dashboard instead.');
        uberDeprecationLogged = true;
    }
    const target = req.originalUrl.replace(/^\/uber/, '/dashboard');
    res.redirect(301, target);
});

// Monitor route alias (formerly /webui for some monitoring pages)
app.use('/monitor', express.static(frontendDistPath));
app.use('/monitor/*', (req: Request, res: Response) => {
    const indexPath = getIndexPath();
    if (indexPath) {
        return res.sendFile(indexPath);
    }
    res.status(500).send('Monitor UI build not found');
});

// API routes - MUST come before static file serving
// app.use('/api/admin', adminRouter);
app.use('/api/swarm', swarmRouter);
app.use('/dashboard', dashboardRouter);
app.use('/webui/api', authenticateToken, webuiConfigRouter);
app.use('/webui', botsRouter);
app.use('/webui', botConfigRouter);
app.use('/webui', validationRouter);
app.use('/webui', hotReloadRouter);
app.use('/webui', ciRouter);
app.use('/webui', enterpriseRouter);
app.use('/webui', secureConfigRouter);
app.use('/webui', authRouter);
app.use('/webui', adminApiRouter);
app.use('/webui', openapiRouter);

// Legacy /webui support - AFTER API routes
app.use('/webui', express.static(frontendDistPath));
app.use('/webui/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'WebUI route not found' });
});

// Admin UI (unified dashboard)
app.use('/admin', express.static(frontendDistPath));
app.get(['/admin', '/admin/*'], (req: Request, res: Response) => {
    const indexPath = getIndexPath();
    if (indexPath) {
        return res.sendFile(indexPath);
    }
    res.status(500).send('Admin UI build not found');
});

// Redirects
// app.use('/webui', (req: Request, res: Response) => res.redirect(301, '/uber' + req.path));
// app.use('/admin', (req: Request, res: Response) => res.redirect(301, '/uber/guards'));

// Deprecated /admin static serve (commented out)
// app.use('/admin', express.static(path.join(process.cwd(), 'public/admin')));
// app.use('/admin', (req: Request, res: Response) => {
//     const adminPath = path.join(process.cwd(), 'public/admin/index.html');
//     res.sendFile(adminPath);
// });

// API routes under /api/uber
// import uberRouter from './routes/uberRouter';
// app.use('/api/uber', uberRouter);

// SPA fallback: serve index.html for known client-side routes so React Router can handle them
const spaClientRoutePrefixes = ['/dashboard', '/admin', '/login', '/monitor'];
app.get('*', (req: Request, res: Response) => {
    const requestPath = req.path;
    console.log('[DEBUG] Catch-all route hit for:', requestPath);

    // If request appears to be for a file with an extension, treat as 404 static
    if (path.extname(requestPath)) {
        return res.status(404).json({ error: 'Resource not found' });
    }

    // Serve SPA index for designated client prefixes
    if (spaClientRoutePrefixes.some(prefix => requestPath === prefix || requestPath.startsWith(prefix + '/'))) {
        const indexPath = getIndexPath();
        if (indexPath) {
            return res.sendFile(indexPath);
        }
        return res.status(500).send('SPA index missing');
    }

    // Default 404 JSON for other unmatched paths (likely API or mis-typed)
    res.status(404).json({ error: 'Endpoint not found' });
});

async function startBot(messengerService: any) {
    try {
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
        idleResponseManager.initialize();
        
        messengerService.setMessageHandler((message: any, historyMessages: any[], botConfig: any) =>
            messageHandlerModule.handleMessage(message, historyMessages, botConfig)
        );
        indexLog('[DEBUG] Message handler set up successfully.');
    } catch (error) {
        indexLog('[ERROR] Error starting bot service:', error);
        // Log the error but don't exit the process - we want other bots to continue working
        console.error('[ERROR] Bot initialization failed:', error instanceof Error ? error.message : String(error));
    }
}

async function main() {
    // Setup Vite server for development
    await setupViteServer();

    // Initialize WebUI server and mount it on the main app
    const webuiApp = getWebUIServer().getApp();
    app.use(webuiApp);

    const llmProviders = getLlmProvider();
    console.log('LLM Providers in use:', llmProviders.map(p => p.constructor.name || 'Unknown').join(', ') || 'Default OpenAI');

    const rawMessageProviders = messageConfig.get('MESSAGE_PROVIDER') as unknown;
    const messageProviders = (typeof rawMessageProviders === 'string'
        ? rawMessageProviders.split(',').map((v: string) => v.trim())
        : Array.isArray(rawMessageProviders)
        ? rawMessageProviders
        : ['slack']) as string[];
    console.log('Message Providers in use:', messageProviders.join(', ') || 'Default Message Service');

    const messengerServices = messengerProviderModule.getMessengerProvider();
    // Only initialize messenger services that match the configured MESSAGE_PROVIDER(s)
    const filteredMessengers = messengerServices.filter((service: any) => {
        // If providerName is not defined, assume 'slack' by default.
        const providerName = service.providerName || 'slack';
        return messageProviders.includes(providerName.toLowerCase());
    });
    if (filteredMessengers.length > 0) {
        indexLog('[DEBUG] Found matching messenger service(s): ' + filteredMessengers.map((s: any) => s.providerName).join(', '));
        for (const service of filteredMessengers) {
            await startBot(service);
        }
    } else {
        indexLog('[DEBUG] No messenger service matching configured MESSAGE_PROVIDER found. Falling back to initializing all messenger services.');
        for (const service of messengerServices) {
            await startBot(service);
        }
    }

    const httpEnabled = process.env.HTTP_ENABLED !== 'false';
    if (httpEnabled) {
        const port = parseInt(process.env.PORT || '5005', 10);
        const server = createServer(app);

        // Initialize WebSocket service
        const wsService = WebSocketService.getInstance();
        wsService.initialize(server);

        server.on('error', (err) => {
            console.error('[DEBUG] Server error:', err);
        });

        console.log(`[DEBUG] Attempting to bind server to port ${port} on host 0.0.0.0`);
        server.listen(port, '0.0.0.0', () => {
            console.log('Server is listening on port ' + port);
            console.log('WebSocket service available at /webui/socket.io');
        });
    } else {
        console.log('HTTP server is disabled (HTTP_ENABLED=false).');
    }

    const isWebhookEnabled = webhookConfig.get('WEBHOOK_ENABLED') || false;
    if (isWebhookEnabled) {
        console.log('Webhook service is enabled, registering routes...');
        for (const messengerService of messengerServices) {
            const channelId = messengerService.getDefaultChannel ? messengerService.getDefaultChannel() : null;
            if (channelId) {
                await webhookServiceModule.webhookService.start(app, messengerService, channelId);
            }
        }
    } else {
        console.log('Webhook service is disabled.');
    }
}

// Export the app for testing purposes
export default app;

// Start the server only if the file is run directly
if (require.main === module) {
    main().catch((error) => {
        console.error('[DEBUG] Unexpected error in main execution:', error);
        process.exit(1);
    });
}
