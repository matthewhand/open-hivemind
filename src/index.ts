require('dotenv/config');
require('module-alias/register');
const indexDebug = require('debug');
const { getMessengerProvider: indexGetMessengerProvider } = require('@message/management/getMessengerProvider');
const { handleMessage: indexHandleMessage } = require('@message/handlers/messageHandler');
const { debugEnvVars } = require('@config/debugEnvVars');
const indexLlmConfig = require('@llm/interfaces/llmConfig');
const indexMessageConfig = require('@message/interfaces/messageConfig');
const express = require('express');
const bodyParser = require('body-parser');
const healthRoute = require('./routes/health');
const { webhookService } = require('@webhook/webhookService');

const indexLog = indexDebug('app:index');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req: any, res: any, next: any) => {
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
    next();
});
app.use(healthRoute);

async function startBot(messengerService: any) {
  try {
    debugEnvVars();
    indexLog('[DEBUG] Starting bot initialization...');
    if (typeof messengerService.setApp === 'function') {
        messengerService.setApp(app);
    }
    await messengerService.initialize();
    indexLog('[DEBUG] Bot initialization completed.');

    indexLog('[DEBUG] Setting up message handler...');
    messengerService.setMessageHandler(indexHandleMessage);
    indexLog('[DEBUG] Message handler set up successfully.');
  } catch (error) {
    indexLog('[DEBUG] Error starting bot service:', error);
  }
}

async function main() {
  console.log('LLM Provider in use:', indexLlmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
  console.log('Message Provider in use:', indexMessageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');

  const messengerService = indexGetMessengerProvider();
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

  const isWebhookEnabled = indexMessageConfig.get('MESSAGE_WEBHOOK_ENABLED') || false;
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
