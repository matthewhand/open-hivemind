import debug from 'debug';
import { DiscordService } from '@src/integrations/discord/DiscordService';
import { handleMessage } from '@src/message/handlers/messageHandler';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import webhookService from '@src/webhook/webhookService';
const { debugEnvVars } = require('@config/debugEnvVars');
import llmConfig from '@llm/interfaces/llmConfig';
import messageConfig from '@message/interfaces/messageConfig';

/**
 * Entry point for initializing and starting the bot service.
 * Integration-agnostic, the bot interfaces with the message and LLM providers.
 * The focus is on setting up the message and LLM providers using the messenger service.
 */
const log = debug('app:index');

/**
 * Starts the bot by initializing the messaging and LLM services and setting the message handler.
 * Handles error scenarios to ensure robust startup.
 * 
 * @param messengerService - The messaging service implementing IMessengerService.
 */
async function startBot(messengerService: IMessengerService) {
  try {
    // Log environment variables for debugging purposes
    debugEnvVars();

    // Set the message handler for incoming messages
    messengerService.setMessageHandler(handleMessage);
    log('[DEBUG] Message handler set up successfully.');
  } catch (error) {
    log('Error starting bot service:', error);
  }
}

/**
 * Main function to initiate the bot service and handle startup tasks.
 * Also starts the webhook service if enabled in configuration.
 */
async function main() {
  console.log('LLM Provider in use:', llmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
  console.log('Message Provider in use:', messageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');

  // Start the bot service
  const messengerService = DiscordService.getInstance();
  await startBot(messengerService);

  // Check if the webhook service is enabled
  const isWebhookEnabled = messageConfig.get('WEBHOOK_ENABLED') || false;
  if (isWebhookEnabled) {
    console.log('Webhook service is enabled, starting...');
    await webhookService.start();  // Start the webhook service if configured
  } else {
    console.log('Webhook service is disabled.');
  }
}

// Start the application by invoking the main function
main().catch((error) => {
  console.error('[DEBUG] Unexpected error in main execution:', error);
  process.exit(1);
});
