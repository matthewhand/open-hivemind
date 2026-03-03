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
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';

const log = Debug('app:webhookService');

export const webhookService = {
  /**
   * Starts the webhook service.
   * @param {Express.Application} [app] - Optional existing Express app instance
   * @param {IMessengerService} messageService - The platform-agnostic message service
   * @param {string} channelId - The ID of the channel to send messages
   */
  start: (
    app: express.Application | null,
    messageService: IMessengerService | null,
    channelId: string
  ): express.Application => {
    let appInstance = app;
    if (!appInstance) {
      appInstance = express(); // Create a new app if none is passed
      appInstance.use(express.json()); // Middleware to parse JSON request bodies

      // Apply standard security headers manually since this isolated instance
      // bypasses the global middleware pipeline defined in the main server.
      appInstance.use((req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        next();
      });
    }

    // Register the webhook routes with the message service
    log('Registering platform-agnostic webhook routes');
    if (!messageService) {
      try {
        configureWebhookRoutes(appInstance, null as unknown as IMessengerService, channelId);
      } catch {
        // Keep startup resilient when no message service is available
      }
    } else {
      configureWebhookRoutes(appInstance, messageService as IMessengerService, channelId);
    }

    log('Webhook service initialized. Ready to accept webhook requests.');
    return appInstance;
  },
};
