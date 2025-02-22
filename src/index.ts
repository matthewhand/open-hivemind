require('dotenv/config');
require('module-alias/register');
const express = require('express');
// Import Express types for TypeScript
import { Request, Response, NextFunction } from 'express';
const debug = require('debug');
const messengerProviderModule = require('@message/management/getMessengerProvider');
const messageHandlerModule = require('@message/handlers/messageHandler');
const debugEnvVarsModule = require('@config/debugEnvVars');
const llmConfigModule = require('@llm/interfaces/llmConfig');
const messageConfigModule = require('@config/messageConfig');
const healthRouteModule = require('./routes/health');
const webhookServiceModule = require('@webhook/webhookService');

const indexLog = debug('app:index');
const app = express();

// Debug the healthRoute import
const healthRoute = healthRouteModule.default || healthRouteModule;
console.log('healthRoute:', healthRoute);
console.log('healthRoute type:', typeof healthRoute);
console.log('healthRoute is function:', typeof healthRoute === 'function');

// Debug the llmConfig import
const llmConfig = llmConfigModule.default || llmConfigModule;
console.log('llmConfig:', llmConfig);
console.log('llmConfig.get exists:', typeof llmConfig.get === 'function');

// Debug the messageConfig import
const messageConfig = messageConfigModule.default || messageConfigModule;
console.log('messageConfig:', messageConfig);
console.log('messageConfig.get exists:', typeof messageConfig.get === 'function');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
    next();
});
app.use(healthRoute);

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
        messengerService.setMessageHandler(messageHandlerModule.handleMessage);
        indexLog('[DEBUG] Message handler set up successfully.');
    } catch (error) {
        indexLog('[DEBUG] Error starting bot service:', error);
        indexLog('[DEBUG] Proceeding despite bot initialization error.');
    }
}

async function main() {
    console.log('LLM Provider in use:', llmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
    console.log('Message Provider in use:', messageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');

    const messengerService = messengerProviderModule.getMessengerProvider();
    await startBot(messengerService);

    const httpEnabled = process.env.HTTP_ENABLED !== 'false';
    if (httpEnabled) {
        const port = process.env.PORT || 5005;
        app.listen(port, () => {
            console.log('Server is listening on port ' + port);
        });
    } else {
        console.log('HTTP server is disabled (HTTP_ENABLED=false).');
    }

    const isWebhookEnabled = messageConfig.get('MESSAGE_WEBHOOK_ENABLED') || false;
    if (isWebhookEnabled) {
        console.log('Webhook service is enabled, registering routes...');
        const channelId = messengerService.getDefaultChannel();
        await webhookServiceModule.webhookService.start(app, messengerService, channelId);
    } else {
        console.log('Webhook service is disabled.');
    }
}

main().catch((error) => {
    console.error('[DEBUG] Unexpected error in main execution:', error);
    process.exit(1);
});
