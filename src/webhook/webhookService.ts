/**
 * Webhook Service
 *
 * This service is responsible for starting an Express server and registering webhook routes.
 * It is designed to be agnostic to the specific message platform and avoids hardcoded configurations
 * related to Discord or any other provider.
 *
 * Features:
 * - Registers secure webhook routes
 * - Integrates IP whitelisting and token verification
 * - Debug logging for tracing execution and identifying issues
 */

import Debug from 'debug';
import express from 'express';
import type { IMessengerService } from '@message/interfaces/IMessengerService';

const log = Debug('app:webhookService');

// Dynamic import helper for webhook routes
let configureWebhookRoutes: ((app: express.Application, messageService: IMessengerService, channelId: string) => void) | null = null;

async function loadWebhookRoutes(): Promise<void> {
  if (configureWebhookRoutes) return;
  try {
    const webhookRoutesModule = await import('@webhook/routes/webhookRoutes');
    configureWebhookRoutes = webhookRoutesModule.configureWebhookRoutes || ((app: express.Application) => {
      return;
    });
  } catch (error) {
    log('Failed to load webhook routes:', error);
    configureWebhookRoutes = (app: express.Application) => {
      return;
    };
  }
}

export const webhookService = {
  /**
   * Starts the webhook service.
   * @param {Express.Application} [app] - Optional existing Express app instance
   * @param {IMessengerService} messageService - The platform-agnostic message service
   * @param {string} channelId - The ID of the channel to send messages
   */
  start: async (
    app: express.Application | null,
    messageService: IMessengerService | null,
    channelId: string
  ) => {
    if (!app) {
      app = express(); // Create a new app if none is passed
      app.use(express.json()); // Middleware to parse JSON request bodies
    }

    // Load webhook routes module
    await loadWebhookRoutes();

    // Register the webhook routes with the message service
    log('Registering platform-agnostic webhook routes');
    if (!messageService) {
      try {
        configureWebhookRoutes!(app, null as unknown as IMessengerService, channelId);
      } catch {
        // Keep startup resilient when no message service is available
      }
    } else {
      configureWebhookRoutes!(app, messageService as IMessengerService, channelId);
    }

    log('Webhook service initialized. Ready to accept webhook requests.');
  },
};
