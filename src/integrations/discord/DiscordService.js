import { Client } from 'discord.js';
import Debug from 'debug';
import { setMessageHandler } from './interaction/setMessageHandler';

const debug = Debug('app:discordService');

class DiscordService {
  constructor() {
    this.client = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });
  }

  async start() {
    setMessageHandler(this.client, async (message) => {
      debug('Handling message:', message.getText());
      // Handle messages in a centralized way via setMessageHandler
    });

    await this.client.login(process.env.DISCORD_TOKEN);
  }
}

export const discordService = new DiscordService();
