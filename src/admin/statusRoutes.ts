import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { Discord } from '@hivemind/message-discord';
import { SlackService } from '@hivemind/message-slack';
import type { IBotInfo } from '../types/botInfo';

const debug = Debug('app:admin:status');
export const statusRouter = Router();

statusRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const slack = SlackService.getInstance();
    const slackBots = slack.getBotNames();
    const slackInfo = slackBots.map((name: string) => {
      const cfg = slack.getBotConfig(name) || {};
      return {
        provider: 'slack',
        name,
        defaultChannel: cfg?.slack?.defaultChannelId || '',
        mode: cfg?.slack?.mode || 'socket',
      };
    });
    let discordBots: string[] = [];
    let discordInfo: { provider: string; name: string }[] = [];
    try {
      const DiscordModule = Discord as unknown as {
        DiscordService: { getInstance: () => unknown };
      };
      const ds = DiscordModule.DiscordService.getInstance() as { getAllBots?: () => IBotInfo[] };
      const bots = ds.getAllBots?.() || [];
      discordBots = bots.map((b) => b?.botUserName || b?.config?.name || 'discord');
      discordInfo = bots.map((b) => ({
        provider: 'discord',
        name: b?.botUserName || b?.config?.name || 'discord',
      }));
    } catch (error) {
      debug('Failed to retrieve Discord bot info (non-fatal)', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: '/status',
      });
    }
    res.json({
      success: true,
      slackBots,
      discordBots,
      discordCount: discordBots.length,
      slackInfo,
      discordInfo,
    });
  } catch {
    res.json({ success: true, bots: [] });
  }
});
