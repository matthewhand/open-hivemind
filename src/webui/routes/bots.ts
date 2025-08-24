import { Router } from 'express';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

const router = Router();

// Get all bots with detailed status
router.get('/api/bots', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    
    const botsWithStatus = bots.map(bot => ({
      ...bot,
      status: {
        active: true, // TODO: Implement real status checking
        lastSeen: new Date().toISOString(),
        messageCount: 0, // TODO: Implement message counting
        errors: [] // TODO: Implement error tracking
      },
      capabilities: {
        messageProvider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        voiceSupport: !!bot.discord?.voiceChannelId,
        multiChannel: bot.messageProvider === 'slack' && !!bot.slack?.joinChannels
      }
    }));
    
    res.json({
      bots: botsWithStatus,
      total: bots.length,
      active: bots.length, // TODO: Count only active bots
      providers: {
        message: [...new Set(bots.map(b => b.messageProvider))],
        llm: [...new Set(bots.map(b => b.llmProvider))]
      }
    });
  } catch (error) {
    console.error('Bots API error:', error);
    res.status(500).json({ error: 'Failed to get bots' });
  }
});

// Get specific bot details
router.get('/api/bots/:name', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bot = manager.getBot(req.params.name);
    
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    res.json({
      ...bot,
      status: {
        active: true,
        lastSeen: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: {
          message: 'connected', // TODO: Check real connection status
          llm: 'connected'
        }
      }
    });
  } catch (error) {
    console.error('Bot details API error:', error);
    res.status(500).json({ error: 'Failed to get bot details' });
  }
});

// Get bot health metrics
router.get('/api/bots/:name/health', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bot = manager.getBot(req.params.name);
    
    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    // TODO: Implement real health checks
    const health = {
      status: 'healthy',
      checks: {
        messageProvider: { status: 'pass', latency: Math.random() * 100 },
        llmProvider: { status: 'pass', latency: Math.random() * 500 },
        memory: { 
          status: process.memoryUsage().heapUsed < 100 * 1024 * 1024 ? 'pass' : 'warn',
          usage: process.memoryUsage()
        }
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(health);
  } catch (error) {
    console.error('Bot health API error:', error);
    res.status(500).json({ error: 'Failed to get bot health' });
  }
});

export default router;