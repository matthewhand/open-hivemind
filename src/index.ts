import { webhookService } from './webhook/webhookService';
import { getMessageProvider } from './message/management/getMessageProvider';

// Main function to initialize the webhook service with hardcoded values
async function startWebhookService() {
  console.log('Starting webhook service with hardcoded values...');

  const defaultChannelId = 'default-channel';
  const defaultPort = 8080;
  const messageService = getMessageProvider(); // Getting a valid message service

  await webhookService.start(messageService, defaultChannelId, defaultPort);
}

// Execute the main function
startWebhookService();
