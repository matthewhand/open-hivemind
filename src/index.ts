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
import Logger from '@common/logger';
const debug = require('debug');
const messengerProviderModule = require('@message/management/getMessengerProvider');
const messageHandlerModule = require('@message/handlers/messageHandler');
const debugEnvVarsModule = require('@config/debugEnvVars');
const messageConfigModule = require('@config/messageConfig');
const webhookConfigModule = require('@config/webhookConfig');
const healthRouteModule = require('./routes/health');
const webhookServiceModule = require('@webhook/webhookService');
import swarmRouter from '@src/admin/swarmRoutes';
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

const indexLog = debug('app:index');
const appLogger = Logger.withContext('app:index');
const httpLogger = Logger.withContext('http');
const frontendLogger = Logger.withContext('frontend');
const skipMessengers = process.env.SKIP_MESSENGERS === 'true';

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

if (!fs.existsSync(frontendDistPath)) {
    frontendLogger.warn('Frontend dist directory not found', { path: frontendDistPath });
}

// Add error handling for unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
    appLogger.error('Unhandled promise rejection', { promise, reason });
    // Application specific logging, throwing an error, or other logic here
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    appLogger.error('Uncaught exception', { error });
    // Application specific logging, throwing an error, or other logic here
    process.exit(1);
});

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
    httpLogger.debug('Incoming request', { method: req.method, path: req.path });

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none';");

    next();
});
app.use(healthRoute);

app.use(express.static(frontendDistPath));

// Serve unified dashboard at root
app.get('/', (req: Request, res: Response) => {
    const indexPath = path.join(frontendDistPath, 'index.html');
    appLogger.debug('Handling root request for frontend shell', { frontendDistPath, indexPath });

    if (fs.existsSync(indexPath)) {
        appLogger.debug('Serving frontend index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                appLogger.error('Error sending frontend file', { error: err });
                res.status(500).send('Error serving frontend');
            } else {
                appLogger.info('Frontend served successfully');
            }
        });
    } else {
        appLogger.error('Frontend index.html not found', { indexPath });
        res.status(404).send('Frontend not found - please run npm run build:frontend');
    }
});

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Serve static files from webui dist directory
app.use(express.static(frontendDistPath));

// Global assets static for root-relative asset paths
app.use('/assets', express.static(frontendAssetsPath));

// Uber UI (unified dashboard)
app.use('/uber', express.static(frontendDistPath));
app.use('/uber/*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
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
app.use('/admin/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'Admin route not found' });
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

// Catch-all handler for React Router (must be AFTER all API routes)
// Return 404 for all non-existent routes
app.get('*', (req: Request, res: Response) => {
    httpLogger.debug('No matching route for request', { path: req.path });
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
        appLogger.error('Bot initialization failed', { error });
    }
}

async function main() {
    const llmProviders = getLlmProvider();
    appLogger.info('Resolved LLM providers', { providers: llmProviders.map(p => p.constructor.name || 'Unknown') });

    // Prepare messenger services collection for optional webhook registration later
    let messengerServices: any[] = [];

    if (skipMessengers) {
        appLogger.info('Skipping messenger initialization due to SKIP_MESSENGERS=true');
    } else {
        const rawMessageProviders = messageConfig.get('MESSAGE_PROVIDER') as unknown;
        const messageProviders = (typeof rawMessageProviders === 'string'
            ? rawMessageProviders.split(',').map((v: string) => v.trim())
            : Array.isArray(rawMessageProviders)
            ? rawMessageProviders
            : ['slack']) as string[];
        appLogger.info('Resolved message providers', { providers: messageProviders });

        messengerServices = messengerProviderModule.getMessengerProvider();
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
    }

    const httpEnabled = process.env.HTTP_ENABLED !== 'false';
    if (httpEnabled) {
        const port = parseInt(process.env.PORT || '3028', 10);
        const server = createServer(app);

        // Initialize WebSocket service
        const wsService = WebSocketService.getInstance();
        wsService.initialize(server);

        server.on('error', (err) => {
            appLogger.error('HTTP server error', { error: err });
        });

        appLogger.info('Binding HTTP server', { port, host: '0.0.0.0' });
        server.listen(port, '0.0.0.0', () => {
            appLogger.info('HTTP server listening', { port });
            appLogger.info('WebSocket service ready', { endpoint: '/webui/socket.io' });
        });
    } else {
        appLogger.info('HTTP server is disabled via configuration');
    }

    const isWebhookEnabled = webhookConfig.get('WEBHOOK_ENABLED') || false;
    if (isWebhookEnabled) {
        appLogger.info('Webhook service enabled; registering routes');
        for (const messengerService of messengerServices) {
            const channelId = messengerService.getDefaultChannel ? messengerService.getDefaultChannel() : null;
            if (channelId) {
                await webhookServiceModule.webhookService.start(app, messengerService, channelId);
            }
        }
    } else {
        appLogger.info('Webhook service is disabled');
    }
}

main().catch((error) => {
    appLogger.error('Unexpected error in main execution', { error });
    process.exit(1);
});

export default app;
