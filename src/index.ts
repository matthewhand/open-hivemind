import { webhookService } from './webhook/webhookService';
import { messageConfig } from './message/interfaces/messageConfig';
import { webhookConfig } from './webhook/interfaces/webhookConfig';
import { getMessageProvider } from './message/management/getMessageProvider';

// Check if the webhook service is enabled
const isWebhookEnabled = messageConfig.get('MESSAGE_WEBHOOK_ENABLED') || false;
if (isWebhookEnabled) {
  console.log('Webhook service is enabled, starting...');

  // Retrieve necessary configurations
  const messageService = getMessageProvider();
  const channelId = messageConfig.get('MESSAGE_DEFAULT_CHANNEL_ID') as string;
  const webhookPort = webhookConfig.get('WEBHOOK_PORT').toString();

  // Start the webhook service with the message service, channel ID, and webhook port
  await webhookService.start(messageService, channelId, webhookPort);
} else {
  console.log('Webhook service is disabled.');
}
