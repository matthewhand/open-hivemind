import { Router } from 'express';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

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

router.get('/api/status', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
  
  const status = bots.map(bot => ({
    name: bot.name,
    provider: bot.messageProvider,
    llmProvider: bot.llmProvider,
    status: 'active' // TODO: Add real status checking
  }));
  
  res.json({ bots: status, uptime: process.uptime() });
  } catch (error) {
    console.error('Status API error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;