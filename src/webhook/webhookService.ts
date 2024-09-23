/**
 * Webhook Service
 * 
 * This service is responsible for starting an Express server and registering webhook routes
 * that allow the bot to handle incoming webhook events. It integrates security mechanisms 
 * such as token verification and IP whitelisting, and supports robust error handling with logging.
 * 
 * Features:
 * - Starts an Express server on a configurable port (default: 80)
 * - Registers secure webhook routes
 * - Integrates IP whitelisting and token verification
 * - Ensures Discord channel presence and valid configurations before proceeding
 * - Debug logging for tracing execution and identifying issues
 */

import express from 'express';
import webhookConfig from '@webhook/interfaces/webhookConfig';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import { Client, TextChannel } from 'discord.js';
import Debug from 'debug';

const log = Debug('app:webhookService');

export const webhookService = {
  /**
   * Starts the webhook service.
   * @param {Client} client - The Discord.js client instance
   * @param {number} port - The port to run the webhook server on (defaults to 80)
   */
  start: (client: Client, port: number = 80) => {
    // Guard clauses to ensure essential components are configured correctly
    if (!client) {
      log('Client not provided. Exiting webhook service start.');
      throw new Error('Discord client is required to start the webhook service.');
    }

    // Ensure a valid Discord channel ID is configured
    const discordChannelId = webhookConfig.get('DISCORD_CHAT_CHANNEL_ID');
    if (!discordChannelId) {
      log('No Discord channel ID found in config.');
      throw new Error('DISCORD_CHAT_CHANNEL_ID is required to register webhook routes.');
    }

    const app = express();
    app.use(express.json()); // Middleware to parse JSON request bodies

    // Register the webhook routes, passing the client and channel ID
    log(`Registering webhook routes with Discord channel ID: ${discordChannelId}`);
    configureWebhookRoutes(app, client, discordChannelId);

    // Start the Express server and listen on the specified port
    app.listen(port, () => {
      log(`Webhook service started successfully on port ${port}`);
      console.log(`Webhook service is running on port ${port}`);
    });

    log('Webhook service initialized. Ready to accept webhook requests.');
  }
};
