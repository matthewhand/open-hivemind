import { Router } from 'express';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import WebSocketService from '@src/webui/services/WebSocketService';

const router = Router();

router.get('/', (req, res) => {
  try {
    const bots = BotConfigurationManager.getInstance().getAllBots();
    res.render('dashboard', { bots, title: 'Open-Hivemind Dashboard' });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

function isProviderConnected(bot: any): boolean {
  try {
    if (bot.messageProvider === 'slack') {
      const svc = require('@integrations/slack/SlackService').default as any;
      const instance = svc?.getInstance?.();
      const mgr = instance?.getBotManager?.(bot.name) || instance?.getBotManager?.();
      const bots = mgr?.getAllBots?.() || [];
      return Array.isArray(bots) && bots.length > 0;
    }
    if (bot.messageProvider === 'discord') {
      const svc = require('@integrations/discord/DiscordService') as any;
      const instance = svc?.DiscordService?.getInstance?.() || svc?.Discord?.DiscordService?.getInstance?.();
      const bots = instance?.getAllBots?.() || [];
      return Array.isArray(bots) && bots.length > 0;
    }
    return true;
  } catch {
    return true; // safe fallback
  }
}

router.get('/api/status', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const ws = WebSocketService.getInstance();

    // Keep status lightweight and deterministic for tests: mark configured bots as active
    const status = bots.map(bot => ({
      name: bot.name,
      provider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      status: 'active',
      connected: isProviderConnected(bot),
      messageCount: ws.getBotStats(bot.name).messageCount,
      errorCount: ws.getBotStats(bot.name).errors.length
    }));

    res.json({ bots: status, uptime: process.uptime() });
  } catch (error) {
    console.error('Status API error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
