require('dotenv/config');
require('module-alias/register');
import debug from 'debug';
import { DiscordService } from '../src/integrations/discord/DiscordService';
import { handleMessage } from '../src/message/handlers/messageHandler';
import { IMessengerService } from '../src/message/interfaces/IMessengerService';
import { webhookService } from '../src/webhook/webhookService';
const { debugEnvVars } = require('@config/debugEnvVars');
import llmConfig from '@llm/interfaces/llmConfig';
import webhookConfig from '@webhook/interfaces/webhookConfig';
import messageConfig from '@message/interfaces/messageConfig'; 
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import express from 'express'; // Add Express app

// Logging setup
const log = debug('app:index');

// Define Express app for webhook service
const app = express();

/**
 * Starts the bot service by initializing the messaging and LLM services.
 * Sets up the message handler and logs relevant information.
 */
async function startBot(messengerService: IMessengerService) {
  try {
    // Log environment variables for debugging
    debugEnvVars();

    // Set the message handler for incoming messages
    messengerService.setMessageHandler(handleMessage);
    log('[DEBUG] Message handler set up successfully.');
  } catch (error) {
    log('Error starting bot service:', error);
  }
}

/**
 * Main function to initialize both the bot service and webhook service (if enabled).
 */
async function main() {
  // Log the LLM and message providers in use
  console.log('LLM Provider in use:', llmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
  console.log('Message Provider in use:', messageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');

  // Initialize and start the Discord bot service
  const messengerService = DiscordService.getInstance();
  await startBot(messengerService);

  // Check if the webhook service is enabled via configuration
  const isWebhookEnabled = messageConfig.get('MESSAGE_WEBHOOK_ENABLED') || false;
  if (isWebhookEnabled) {
    console.log('Webhook service is enabled, starting...');

    // Get necessary configurations for the webhook service from discordConfig and webhookConfig
    const channelId = discordConfig.get('DISCORD_CHAT_CHANNEL_ID') || '';  // Fetch channel ID from discordConfig
    const webhookPort = webhookConfig.get('WEBHOOK_PORT') || 80;

    // Start the webhook service with Express `app` and convert `webhookPort` to string
    await webhookService.start(app, messengerService, channelId, Number(webhookPort));  
  } else {
    console.log('Webhook service is disabled.');
  }
}

// Start the application by invoking the main function
main().catch((error) => {
  console.error('[DEBUG] Unexpected error in main execution:', error);
  process.exit(1);
});
