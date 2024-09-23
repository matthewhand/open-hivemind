import { webhookService } from './webhook/webhookService';
import messageConfig from './message/interfaces/messageConfig';
import webhookConfig from './webhook/interfaces/webhookConfig';
import { getMessageProvider } from './message/management/getMessageProvider';

// Define the correct paths for convict
const MESSAGE_DEFAULT_CHANNEL_ID_PATH = 'MESSAGE_DEFAULT_CHANNEL_ID';
const MESSAGE_WEBHOOK_ENABLED_PATH = 'MESSAGE_WEBHOOK_ENABLED';
const WEBHOOK_PORT_PATH = 'WEBHOOK_PORT';

// Main function to initialize the webhook service
async function startWebhookService() {
  const isWebhookEnabled = messageConfig.get<boolean>(MESSAGE_WEBHOOK_ENABLED_PATH) || false;
  if (isWebhookEnabled) {
    console.log('Webhook service is enabled, starting...');

    const messageService = getMessageProvider();
    const channelId = messageConfig.get<string>(MESSAGE_DEFAULT_CHANNEL_ID_PATH);
    const webhookPort = webhookConfig.get<number>(WEBHOOK_PORT_PATH);

    await webhookService.start(messageService, channelId, webhookPort);
  } else {
    console.log('Webhook service is disabled.');
  }
}

// Execute the main function
startWebhookService();
