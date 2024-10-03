/**
 * Webhook Service
 * 
 * This service is responsible for starting an Express server and registering webhook routes.
 * It is designed to be agnostic to the specific message platform and avoids hardcoded configurations
 * related to Discord or any other provider.
 * 
 * Features:
 * - Starts an Express server on a configurable port (default: 80)
 * - Registers secure webhook routes
 * - Integrates IP whitelisting and token verification
 * - Debug logging for tracing execution and identifying issues
 */

import express from 'express';
import webhookConfig from '@webhook/interfaces/webhookConfig';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';

const log = Debug('app:webhookService');

export const webhookService = {
  /**
   * Starts the webhook service.
   * @param {Express.Application} [app] - Optional existing Express app instance
   * @param {IMessengerService} messageService - The platform-agnostic message service
   * @param {string} channelId - The ID of the channel to send messages
   * @param {number} port - The port to run the webhook server on (defaults to 80)
   */
  start: (app: express.Application | null, messageService: IMessengerService, channelId: string, port: number = webhookConfig.get('WEBHOOK_PORT') as number) => {
    if (!app) {
      app = express(); // Create a new app if none is passed
      app.use(express.json()); // Middleware to parse JSON request bodies
    }

    // Register the webhook routes with the message service
    log('Registering platform-agnostic webhook routes');
    configureWebhookRoutes(app, messageService);

    // Only listen on the port if we created a new app (no external app was passed)
    // if (!app.listen) {
      // app.listen(port, () => {
        // log(`Webhook service started successfully on port ${port}`);
        // console.log(`Webhook service is running on port ${port}`);
      // });
    // }

    log('Webhook service initialized. Ready to accept webhook requests.');
  }
};
