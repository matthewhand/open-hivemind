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
const metricsRouteModule = require('./routes/metrics');
import { getLlmProvider } from '@llm/getLlmProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';

const indexLog = debug('app:index');
const app = express();
debug("Messenger services are being initialized...");

const healthRoute = healthRouteModule.default || healthRouteModule;
// const llmConfig = llmConfigModule.default || llmConfigModule;
const messageConfig = messageConfigModule.default || messageConfigModule;
const webhookConfig = webhookConfigModule.default || webhookConfigModule;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
    next();
});
app.use(healthRoute);
const metricsRoute = metricsRouteModule.default || metricsRouteModule;
app.use(metricsRoute);

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
        app.listen(port, () => {
            console.log('Server is listening on port ' + port);
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
