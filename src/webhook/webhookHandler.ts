import { Request, Response } from 'express';
import { DiscordManager } from '@src/message/discord/DiscordManager';
import logger from '@src/utils/logger';

/**
 * Handles incoming webhooks and processes the relevant events.
 * @param {Request} req - The incoming request object.
 * @param {Response} res - The outgoing response object.
 * @returns {void}
 */
export function webhookHandler(req: Request, res: Response): void {
  try {
    const event = req.body.event;
    logger.info('Received event: ' + event.type);

    if (event.type === 'message') {
      const discordManager = DiscordManager.getInstance();
      discordManager.processMessage(event.data);
    }

    res.status(200).send('Event processed successfully');
  } catch (error: any) {
    logger.error('Error processing webhook: ' + (error instanceof Error ? error.message : String(error)));
    res.status(500).send('Internal Server Error');
  }
}
