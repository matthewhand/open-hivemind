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
   * @param {IMessengerService} messageService - The platform-agnostic message service
   * @param {number} port - The port to run the webhook server on (defaults to 80)
   */
  start: (messageService: IMessengerService, port: number = webhookConfig.get('WEBHOOK_PORT') as number) => {
    const app = express();
    app.use(express.json()); // Middleware to parse JSON request bodies

    // Register the webhook routes with the message service
    log('Registering platform-agnostic webhook routes');
    configureWebhookRoutes(app, messageService);

    // Start the Express server and listen on the specified port
    app.listen(port, () => {
      log(`Webhook service started successfully on port ${port}`);
      console.log(`Webhook service is running on port ${port}`);
    });

    log('Webhook service initialized. Ready to accept webhook requests.');
  }
};
