require('dotenv/config');
require('module-alias/register');
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
import adminRouter from '@src/admin/adminRoutes';
import swarmRouter from '@src/admin/swarmRoutes';
import dashboardRouter from '@src/webui/routes/dashboard';
import configRouter from '@src/webui/routes/config';
import botsRouter from '@src/webui/routes/bots';
import botConfigRouter from '@src/webui/routes/botConfig';
import validationRouter from '@src/webui/routes/validation';
import hotReloadRouter from '@src/webui/routes/hotReload';
import ciRouter from '@src/webui/routes/ci';
import enterpriseRouter from '@src/webui/routes/enterprise';
import secureConfigRouter from '@src/webui/routes/secureConfig';
import authRouter from '@src/webui/routes/auth';
import adminApiRouter from '@src/webui/routes/admin';
import openapiRouter from '@src/webui/routes/openapi';
import WebSocketService from '@src/webui/services/WebSocketService';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { getLlmProvider } from '@llm/getLlmProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';

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

// Add signal handlers for graceful shutdown
process.on('SIGINT', async () => {
    console.log('[INFO] Received SIGINT. Shutting down gracefully...');
    await shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('[INFO] Received SIGTERM. Shutting down gracefully...');
    await shutdown();
    process.exit(0);
});

async function shutdown(): Promise<void> {
    console.log('[INFO] Performing cleanup...');
    // Add any cleanup logic here
    // For example, closing database connections, stopping services, etc.
    
    // Clean up idle response manager timers
    try {
        const idleResponseManager = IdleResponseManager.getInstance();
        idleResponseManager.clearAllChannels();
        console.log('[INFO] Idle response manager timers cleared');
    } catch (error) {
        console.error('[ERROR] Failed to clear idle response manager timers:', error);
    }
}

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
    indexLog(`Incoming request: ${req.method} ${req.path}`);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none';");

    next();
});
app.use(healthRoute);

// Serve unified dashboard at root
app.get('/', (req: Request, res: Response) => {
    indexLog('Root route hit');
    indexLog('__dirname:', __dirname);
    const dashboardPath = path.join(__dirname, '../public/index.html');
    indexLog('Resolved dashboardPath:', dashboardPath);
    if (fs.existsSync(dashboardPath)) {
        indexLog('File exists, sending...');
        res.sendFile(dashboardPath, (err) => {
            if (err) {
                indexLog('Error sending file:', err);
                res.status(500).send('Error serving file');
            } else {
                indexLog('File sent successfully');
            }
        });
    } else {
        indexLog('File does not exist at path:', dashboardPath);
        res.status(404).send('File not found');
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve static files from webui dist directory
app.use(express.static(path.join(__dirname, '../webui/dist')));

// Admin UI (demo)
app.use('/api/admin', adminRouter);
app.use('/api/swarm', swarmRouter);
app.use('/admin', (req: Request, res: Response) => {
    const adminPath = path.join(__dirname, '../public/admin/index.html');
    res.sendFile(adminPath);
});

// WebUI (React app)
app.use('/webui', (req: Request, res: Response) => {
    const webuiPath = path.join(__dirname, '../webui/dist/index.html');
    res.sendFile(webuiPath);
});

// WebUI API routes - dashboard router for API endpoints only
app.use('/dashboard', dashboardRouter);
app.use('/webui', configRouter);
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
    const llmProviders = getLlmProvider();
    indexLog('LLM Providers in use:', llmProviders.map(p => p.constructor.name || 'Unknown').join(', ') || 'Default OpenAI');

    const rawMessageProviders = messageConfig.get('MESSAGE_PROVIDER') as unknown;
    const messageProviders = (typeof rawMessageProviders === 'string'
        ? rawMessageProviders.split(',').map((v: string) => v.trim())
        : Array.isArray(rawMessageProviders)
        ? rawMessageProviders
        : ['slack']) as string[];
    indexLog('Message Providers in use:', messageProviders.join(', ') || 'Default Message Service');

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
        const port = process.env.PORT || 5005;
        const server = createServer(app);

        // Initialize WebSocket service
        const wsService = WebSocketService.getInstance();
        wsService.initialize(server);

        server.on('error', (err) => {
            indexLog('Server error:', err);
        });

        indexLog(`Attempting to bind server to port ${port} on host 0.0.0.0`);
        server.listen({port: port, host: '0.0.0.0'}, () => {
            indexLog('Server is listening on port ' + port);
            indexLog('WebSocket service available at /webui/socket.io');
        });
    } else {
        indexLog('HTTP server is disabled (HTTP_ENABLED=false).');
    }

    const isWebhookEnabled = webhookConfig.get('WEBHOOK_ENABLED') || false;
    if (isWebhookEnabled) {
        indexLog('Webhook service is enabled, registering routes...');
        for (const messengerService of messengerServices) {
            const channelId = messengerService.getDefaultChannel ? messengerService.getDefaultChannel() : null;
            if (channelId) {
                await webhookServiceModule.webhookService.start(app, messengerService, channelId);
            }
        }
    } else {
        indexLog('Webhook service is disabled.');
    }
}

main().catch((error) => {
    console.error('[DEBUG] Unexpected error in main execution:', error);
    process.exit(1);
});
