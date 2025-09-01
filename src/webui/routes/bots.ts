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

// Create a new bot
router.post('/api/bots', (req, res) => {
  try {
    const { name, messageProvider, llmProvider, config } = req.body;

    if (!name || !messageProvider || !llmProvider) {
      return res.status(400).json({
        error: 'Missing required fields: name, messageProvider, llmProvider'
      });
    }

    // Get current BOTS environment variable
    const currentBots = process.env.BOTS || '';
    const botNames = currentBots ? currentBots.split(',').map(n => n.trim()) : [];

    // Check if bot name already exists
    if (botNames.includes(name)) {
      return res.status(409).json({ error: 'Bot with this name already exists' });
    }

    // Add new bot name to the list
    botNames.push(name);

    // Update BOTS environment variable
    const newBotsEnv = botNames.join(',');
    process.env.BOTS = newBotsEnv;

    // Set bot-specific environment variables
    const envPrefix = `BOTS_${name.toUpperCase()}`;
    process.env[`${envPrefix}_MESSAGE_PROVIDER`] = messageProvider;
    process.env[`${envPrefix}_LLM_PROVIDER`] = llmProvider;

    // Set provider-specific configuration
    if (messageProvider === 'discord' && config?.discord) {
      if (config.discord.token) {
        process.env[`${envPrefix}_DISCORD_BOT_TOKEN`] = config.discord.token;
      }
      if (config.discord.clientId) {
        process.env[`${envPrefix}_DISCORD_CLIENT_ID`] = config.discord.clientId;
      }
      if (config.discord.guildId) {
        process.env[`${envPrefix}_DISCORD_GUILD_ID`] = config.discord.guildId;
      }
      if (config.discord.channelId) {
        process.env[`${envPrefix}_DISCORD_CHANNEL_ID`] = config.discord.channelId;
      }
    }

    if (llmProvider === 'openai' && config?.openai?.apiKey) {
      process.env[`${envPrefix}_OPENAI_API_KEY`] = config.openai.apiKey;
    }

    if (llmProvider === 'flowise' && config?.flowise?.apiKey) {
      process.env[`${envPrefix}_FLOWISE_API_KEY`] = config.flowise.apiKey;
    }

    // Reload configuration
    const manager = BotConfigurationManager.getInstance();
    manager.reload();

    res.json({
      success: true,
      message: `Bot '${name}' created successfully`,
      bot: { name, messageProvider, llmProvider, ...config }
    });
  } catch (error) {
    console.error('Create bot error:', error);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// Clone an existing bot
router.post('/api/bots/:name/clone', (req, res) => {
  try {
    const { name } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ error: 'New bot name is required' });
    }

    const manager = BotConfigurationManager.getInstance();
    const sourceBot = manager.getBot(name);

    if (!sourceBot) {
      return res.status(404).json({ error: 'Source bot not found' });
    }

    // Get current BOTS environment variable
    const currentBots = process.env.BOTS || '';
    const botNames = currentBots ? currentBots.split(',').map(n => n.trim()) : [];

    // Check if new bot name already exists
    if (botNames.includes(newName)) {
      return res.status(409).json({ error: 'Bot with this name already exists' });
    }

    // Add new bot name to the list
    botNames.push(newName);

    // Update BOTS environment variable
    const newBotsEnv = botNames.join(',');
    process.env.BOTS = newBotsEnv;

    // Clone configuration
    const envPrefix = `BOTS_${newName.toUpperCase()}`;
    const sourcePrefix = `BOTS_${name.toUpperCase()}`;

    // Copy all environment variables from source bot
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(sourcePrefix)) {
        const newKey = key.replace(sourcePrefix, envPrefix);
        process.env[newKey] = process.env[key];
      }
    });

    // Reload configuration
    manager.reload();

    res.json({
      success: true,
      message: `Bot '${name}' cloned as '${newName}' successfully`,
      bot: { ...sourceBot, name: newName }
    });
  } catch (error) {
    console.error('Clone bot error:', error);
    res.status(500).json({ error: 'Failed to clone bot' });
  }
});

// Delete a bot
router.delete('/api/bots/:name', (req, res) => {
  try {
    const { name } = req.params;

    // Get current BOTS environment variable
    const currentBots = process.env.BOTS || '';
    const botNames = currentBots ? currentBots.split(',').map(n => n.trim()) : [];

    // Check if bot exists
    if (!botNames.includes(name)) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Remove bot from the list
    const updatedBotNames = botNames.filter(n => n !== name);

    // Update BOTS environment variable
    const newBotsEnv = updatedBotNames.join(',');
    process.env.BOTS = newBotsEnv;

    // Remove bot-specific environment variables
    const envPrefix = `BOTS_${name.toUpperCase()}`;
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(envPrefix)) {
        delete process.env[key];
      }
    });

    // Reload configuration
    const manager = BotConfigurationManager.getInstance();
    manager.reload();

    res.json({
      success: true,
      message: `Bot '${name}' deleted successfully`
    });
  } catch (error) {
    console.error('Delete bot error:', error);
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

export default router;