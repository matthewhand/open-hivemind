require('dotenv/config');
import 'module-alias/register';
import debug from 'debug';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { handleMessage } from '@message/handlers/messageHandler';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { webhookService } from '@webhook/webhookService';
const { debugEnvVars } = require('@config/debugEnvVars');
import llmConfig from '@llm/interfaces/llmConfig';
import messageConfig from '@message/interfaces/messageConfig';
import express from 'express';
import bodyParser from 'body-parser';
import healthRoute from './routes/health';

const log = debug('app:index');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
    next();
});
app.use(healthRoute);

async function startBot(messengerService: IMessengerService) {
  try {
    debugEnvVars();
    log('[DEBUG] Starting bot initialization...');
    await messengerService.initialize(app);
    log('[DEBUG] Bot initialization completed.');

    log('[DEBUG] Setting up message handler...');
    messengerService.setMessageHandler(handleMessage);
    log('[DEBUG] Message handler set up successfully.');
  } catch (error) {
    log('[DEBUG] Error starting bot service:', error);
  }
}

async function main() {
  console.log('LLM Provider in use:', llmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
  console.log('Message Provider in use:', messageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');

  const messengerService = getMessengerProvider();
  await startBot(messengerService);

  // Only start the HTTP server if HTTP_ENABLED is not set to "false"
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
    await webhookService.start(app, messengerService, channelId);
  } else {
    console.log('Webhook service is disabled.');
  }
}

main().catch((error) => {
  console.error('[DEBUG] Unexpected error in main execution:', error);
  process.exit(1);
});
