require('dotenv/config');
require('module-alias/register');
import debug from 'debug';
import { DiscordService } from '../src/integrations/discord/DiscordService';
import { handleMessage } from './message/handlers/messageHandler';
import { IMessengerService } from '../src/message/interfaces/IMessengerService';
import { webhookService } from '../src/webhook/webhookService';
const { debugEnvVars } = require('@config/debugEnvVars');
import llmConfig from '@llm/interfaces/llmConfig';
import messageConfig from '@message/interfaces/messageConfig';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import express from 'express'; // Add Express app
import healthRoute from './routes/health'; // Import the health route

// Logging setup
const log = debug('app:index');

// Define Express app for webhook service
const app = express();

// Register the health route
app.use(healthRoute);

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
  console.log('LLM Provider in use:', llmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
  console.log('Message Provider in use:', messageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');

  // Initialize and start the Discord bot service
  const messengerService = DiscordService.getInstance();
  await startBot(messengerService);

  // Use PORT from environment variables or fallback to 5005
  const port = process.env.PORT || 5005;

  // Always listen on PORT
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });

  // Check if the webhook service is enabled via configuration
  const isWebhookEnabled = messageConfig.get('MESSAGE_WEBHOOK_ENABLED') || false;
  if (isWebhookEnabled) {
    console.log('Webhook service is enabled, registering routes...');

    // Get channel configuration and bonuses
    const channelId = discordConfig.get('DISCORD_CHANNEL_ID') || '';
    const bonuses: Record<string, number> = discordConfig.get('DISCORD_CHANNEL_BONUSES') || {};
    const globalModifier = discordConfig.get('DISCORD_UNSOLICITED_CHANCE_MODIFIER') || 1.0;
    const bonus = bonuses[channelId] ?? globalModifier;

    console.log(`Using bonus: ${bonus} for channel: ${channelId}`);

    // Start webhook service on the existing Express app
    await webhookService.start(app, messengerService, channelId);
  } else {
    console.log('Webhook service is disabled.');
  }
}

// Start the application by invoking the main function
main().catch((error) => {
  console.error('[DEBUG] Unexpected error in main execution:', error);
  process.exit(1);
});
