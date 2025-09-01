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

    // Import messenger provider to check service health
    const { getMessengerProvider } = require('@message/management/getMessengerProvider');
    const messengerServices = getMessengerProvider();

    const status = bots.map(bot => {
      // Find corresponding service for this bot
      const service = messengerServices.find((svc: any) =>
        svc.provider === bot.messageProvider.toLowerCase()
      );

      let botStatus = 'inactive';
      let healthDetails = {};

      if (service) {
        try {
          // Check if service has a valid client/connection
          if (service.getClientId && typeof service.getClientId === 'function') {
            const clientId = service.getClientId();
            if (clientId) {
              botStatus = 'active';
              healthDetails = { clientId };
            }
          }

          // For Discord, check if client is ready
          if (bot.messageProvider.toLowerCase() === 'discord' && service.client) {
            const discordClient = service.client;
            if (discordClient.readyAt) {
              botStatus = 'active';
              healthDetails = {
                readyAt: discordClient.readyAt,
                uptime: discordClient.uptime,
                guilds: discordClient.guilds?.cache?.size || 0
              };
            } else {
              botStatus = 'connecting';
            }
          }

          // For Slack, check if client is connected
          if (bot.messageProvider.toLowerCase() === 'slack' && service.client) {
            const slackClient = service.client;
            if (slackClient.connected) {
              botStatus = 'active';
              healthDetails = {
                connected: true,
                team: slackClient.team?.name || 'Unknown'
              };
            } else {
              botStatus = 'connecting';
            }
          }
        } catch (healthCheckError) {
          console.warn(`Health check failed for ${bot.name}:`, healthCheckError);
          botStatus = 'error';
          healthDetails = { error: 'Health check failed' };
        }
      } else {
        botStatus = 'unavailable';
        healthDetails = { error: 'Service not found' };
      }

      return {
        name: bot.name,
        provider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        status: botStatus,
        healthDetails
      };
    });

    res.json({ bots: status, uptime: process.uptime() });
  } catch (error) {
    console.error('Status API error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;