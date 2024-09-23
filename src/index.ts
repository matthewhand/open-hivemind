import { webhookService } from './webhook/webhookService';
import messageConfig from './message/interfaces/messageConfig';
import webhookConfig from './webhook/interfaces/webhookConfig';
import { getMessageProvider } from './message/management/getMessageProvider';

// Main function to initialize the webhook service
async function startWebhookService() {
  const isWebhookEnabled = messageConfig.get<boolean>('MESSAGE_WEBHOOK_ENABLED') || false;
  if (isWebhookEnabled) {
    console.log('Webhook service is enabled, starting...');

    const messageService = getMessageProvider();
    const channelId: string = messageConfig.get<string>('MESSAGE_DEFAULT_CHANNEL_ID') || '';
    const webhookPort: number = webhookConfig.get<number>('WEBHOOK_PORT') || 80;

    await webhookService.start(messageService, channelId, webhookPort);
  } else {
    console.log('Webhook service is disabled.');
  }
}

// Execute the main function
startWebhookService();
