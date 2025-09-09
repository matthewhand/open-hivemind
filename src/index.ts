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
import validationRouter from '@src/webui/routes/validation';
import hotReloadRouter from '@src/webui/routes/hotReload';
import ciRouter from '@src/webui/routes/ci';
import enterpriseRouter from '@src/webui/routes/enterprise';
import secureConfigRouter from '@src/webui/routes/secureConfig';
import authRouter from '@src/webui/routes/auth';
import WebSocketService from '@src/webui/services/WebSocketService';
import path from 'path';
import { createServer } from 'http';
import { getLlmProvider } from '@llm/getLlmProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';

const indexLog = debug('app:index');
const app = express();
debug("Messenger services are being initialized...");

const healthRoute = healthRouteModule.default || healthRouteModule;
const messageConfig = messageConfigModule.default || messageConfigModule;
const webhookConfig = webhookConfigModule.default || webhookConfigModule;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
    next();
});
app.use(healthRoute);

// Admin UI (demo)
app.use('/api/admin', adminRouter);
app.use('/api/swarm', swarmRouter);
app.use('/admin', (req: Request, res: Response) => {
    const adminPath = path.join(__dirname, '../public/admin/index.html');
    res.sendFile(adminPath);
});

// WebUI Dashboard routes
app.use('/dashboard', dashboardRouter);
app.use('/webui', configRouter);
app.use('/webui', botsRouter);
app.use('/webui', validationRouter);
app.use('/webui', hotReloadRouter);
app.use('/webui', ciRouter);
app.use('/webui', enterpriseRouter);
app.use('/webui', secureConfigRouter);
app.use('/webui', authRouter);

// Serve React dashboard
app.use('/react-dashboard', (req: Request, res: Response) => {
    const dashboardPath = path.join(__dirname, 'webui/views/react-dashboard.html');
    res.sendFile(dashboardPath);
});

// Serve Real-time dashboard
app.use('/realtime-dashboard', (req: Request, res: Response) => {
    const dashboardPath = path.join(__dirname, 'webui/views/realtime-dashboard.html');
    res.sendFile(dashboardPath);
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
        indexLog('[DEBUG] Error starting bot service:', error);
        indexLog('[DEBUG] Proceeding despite bot initialization error.');
    }
}

async function main() {
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
        const port = process.env.PORT || 5005;
        const server = createServer(app);

        // Initialize WebSocket service
        const wsService = WebSocketService.getInstance();
        wsService.initialize(server);

        server.on('error', (err) => {
            console.error('[DEBUG] Server error:', err);
        });

        console.log(`[DEBUG] Attempting to bind server to port ${port} on host 0.0.0.0`);
        server.listen({port: port, host: '0.0.0.0'}, () => {
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

main().catch((error) => {
    console.error('[DEBUG] Unexpected error in main execution:', error);
    process.exit(1);
});
