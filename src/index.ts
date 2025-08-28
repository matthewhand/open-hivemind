require('dotenv/config');
require('module-alias/register');
const express = require('express');
// Import Express types for TypeScript
import { Request, Response, NextFunction } from 'express';
const debug = require('debug');
import { Logger } from '@src/common/logger';
const messengerProviderModule = require('@message/management/getMessengerProvider');
const messageHandlerModule = require('@message/handlers/messageHandler');
const debugEnvVarsModule = require('@config/debugEnvVars');
const llmConfigModule = require('@config/llmConfig');
const messageConfigModule = require('@config/messageConfig');
const healthRouteModule = require('./routes/health');
import { getLlmProvider } from '@llm/getLlmProvider';
import { IdleResponseManager } from '@message/management/IdleResponseManager';

const indexLog = debug('app:index');
const log = Logger.create('app:index');
const app = express();
debug("Messenger services are being initialized...");

const healthRoute = healthRouteModule.default || healthRouteModule;
// const llmConfig = llmConfigModule.default || llmConfigModule;
const messageConfig = messageConfigModule.default || messageConfigModule;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
    log.debug(`Incoming request: ${req.method} ${req.path}`);
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
    log.info('LLM Providers in use:', llmProviders.map(p => p.constructor.name || 'Unknown').join(', ') || 'Default OpenAI');

    const rawMessageProviders = messageConfig.get('MESSAGE_PROVIDER') as unknown;
    const messageProviders = (typeof rawMessageProviders === 'string'
        ? rawMessageProviders.split(',').map((v: string) => v.trim())
        : Array.isArray(rawMessageProviders)
        ? rawMessageProviders
        : ['slack']) as string[];
    log.info('Message Providers in use:', messageProviders.join(', ') || 'Default Message Service');

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
        // Fail fast if configuration explicitly requested providers but none matched
        if (rawMessageProviders && String(rawMessageProviders).trim().length > 0) {
            log.error('MESSAGE_PROVIDER is set but no matching messenger services were found.');
            throw new Error('No messenger service matches configured MESSAGE_PROVIDER');
        }
        indexLog('[DEBUG] No messenger service configured explicitly; starting all detected messenger services.');
        for (const service of messengerServices) {
            await startBot(service);
        }
    }

    const httpEnabled = process.env.HTTP_ENABLED !== 'false';
    if (httpEnabled) {
        const port = process.env.PORT || 5005;
        app.listen(port, () => {
            log.info('Server is listening on port ' + port);
        });
    } else {
        log.info('HTTP server is disabled (HTTP_ENABLED=false).');
    }

    // Webhook service removed from main branch; preserved on archive/mattermost
}

main().catch((error) => {
    log.error('Unexpected error in main execution:', error);
    process.exit(1);
});
