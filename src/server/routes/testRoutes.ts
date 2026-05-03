import { Router, type Request, type Response } from 'express';
import { asyncErrorHandler } from '@src/middleware/errorHandler';
import { DiscordProvider } from '@src/providers/DiscordProvider';
import { authenticateToken } from '@src/server/middleware/auth';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { HTTP_STATUS } from '@src/types/constants';

const router = Router();

/**
 * POST /api/test/discord
 * Sends a test message to the default Discord channel.
 * SECURED: Requires valid session.
 */
router.post(
  '/discord',
  authenticateToken,
  asyncErrorHandler(async (req: Request, res: Response) => {
    try {
      const provider = new DiscordProvider();
      const channelId = process.env.DISCORD_CHANNEL_ID || '1112523756720627712';

      const messageId = await provider.sendMessage(
        channelId,
        '🚀 **Hivemind Security & Connectivity Test**: Authorized message from secure test endpoint.'
      );

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
