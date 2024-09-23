require('dotenv/config');
require('module-alias/register');
import debug from 'debug';
import { DiscordService } from '../src/integrations/discord/DiscordService';
import { handleMessage } from '../src/message/handlers/messageHandler';
import { IMessengerService } from '../src/message/interfaces/IMessengerService';
import { webhookService } from '../src/webhook/webhookService';

// Hardcoded configuration
const log = debug('app:index');
const defaultChannelId = 'default-channel';
const defaultPort = 8080;

// Function to start the bot
async function startBot(messengerService: IMessengerService) {
  try {
    // Set the message handler for incoming messages
    messengerService.setMessageHandler(handleMessage);
    log('[DEBUG] Message handler set up successfully.');
  } catch (error) {
    log('Error starting bot service:', error);
  }
}

// Main function to initiate the bot service and webhook service
async function main() {
  console.log('Message Provider in use: Default Message Service');
  console.log('LLM Provider in use: Default LLM Service');

  // Start the bot service with Discord
  const messengerService = DiscordService.getInstance();
  await startBot(messengerService);

  // Start the webhook service
  console.log('Starting webhook service with hardcoded values...');
  await webhookService.start(messengerService, defaultChannelId, defaultPort);
}

// Start the application
main().catch((error) => {
  console.error('[DEBUG] Unexpected error in main execution:', error);
  process.exit(1);
});
