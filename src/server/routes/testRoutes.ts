import { Router, type Request, type Response } from 'express';
import { authenticate } from '@src/auth/middleware';
import { asyncErrorHandler } from '@src/middleware/errorHandler';
import {
  pickDiscordMessenger,
  resolveDiscordTestChannelId,
  sendDiscordTestMessage,
} from '@src/server/routes/discordTestChannel';
import { ShutdownCoordinator } from '@src/server/ShutdownCoordinator';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { HTTP_STATUS } from '@src/types/constants';

const router = Router();

const DEFAULT_TEST_MESSAGE =
  '🚀 **Hivemind Security & Connectivity Test**: Authorized message from secure test endpoint.';

/**
 * POST /api/test/discord
 * Sends a test message via the *live* boot-registered Discord messenger.
 * SECURED: Requires valid session (+ CSRF on mutating /api routes).
 *
 * Optional JSON body: { channelId?: string, message?: string }
 * Channel resolution: body.channelId → messenger.getDefaultChannel() →
 * DISCORD_DEFAULT_CHANNEL_ID → DISCORD_CHANNEL_ID
 */
router.post(
  '/discord',
  authenticate,
  asyncErrorHandler(async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { channelId?: unknown; message?: unknown };
      const override =
        typeof body.channelId === 'string'
          ? body.channelId
          : typeof req.query.channelId === 'string'
            ? req.query.channelId
            : undefined;

      const services = ShutdownCoordinator.getInstance().getRegisteredMessengerServices();
      const messenger = pickDiscordMessenger(services);

      if (!messenger) {
        return res
          .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
          .json(
            ApiResponse.error(
              'No live Discord messenger is registered. Ensure MESSAGE_PROVIDER includes discord and messengers started at boot.',
              'DISCORD_MESSENGER_UNAVAILABLE'
            )
          );
      }

      const liveDefault =
        typeof messenger.getDefaultChannel === 'function' ? messenger.getDefaultChannel() : '';
      const channelId = resolveDiscordTestChannelId(process.env, override, liveDefault);

      if (!channelId) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json(
            ApiResponse.error(
              'No Discord channel configured. Set DISCORD_DEFAULT_CHANNEL_ID or DISCORD_CHANNEL_ID, or pass channelId in the request body.',
              'DISCORD_CHANNEL_UNCONFIGURED'
            )
          );
      }

      const messageText =
        typeof body.message === 'string' && body.message.trim().length > 0
          ? body.message.trim()
          : DEFAULT_TEST_MESSAGE;

      const messageId = await sendDiscordTestMessage(messenger, channelId, messageText);

      return res.json(
        ApiResponse.success({
          message: 'Discord test message sent successfully from secure endpoint',
          channelId,
          messageId,
        })
      );
    } catch (error: any) {
      return res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(ApiResponse.error(`Discord test failed: ${error.message}`, 'DISCORD_TEST_FAILED'));
    }
  })
);

export default router;
