const DiscordLibSvc = require('discord.js');
const discordMsgConfig = require('@config/messageConfig');
const DiscordDebug = require('debug');

const DiscordSvc: any = {};

DiscordSvc.DiscordService = class {
  static instance: any;
  bots: any[];
  tokens: string[];

  constructor() {
    this.bots = [];
    this.tokens = (process.env.DISCORD_BOT_TOKEN || 'NO_TOKEN').split(',').map((t: string) => t.trim());
    const usernames = (process.env.DISCORD_USERNAME_OVERRIDE || 'Bot1').split(',').map((u: string) => u.trim());

    // Ensure we have at least as many usernames as tokens, filling with defaults if needed
    while (usernames.length < this.tokens.length) {
      usernames.push(`Bot${usernames.length + 1}`);
    }

    const intents = [
      DiscordLibSvc.GatewayIntentBits.Guilds,
      DiscordLibSvc.GatewayIntentBits.GuildMessages,
      DiscordLibSvc.GatewayIntentBits.MessageContent,
      DiscordLibSvc.GatewayIntentBits.GuildVoiceStates,
    ];

    // Initialize a bot for each token
    this.tokens.forEach((token: string, index: number) => {
      const botUserName = usernames[index];
      const client = new DiscordLibSvc.Client({ intents });
      this.bots.push({ client, botUserId: '', botUserName });
    });
  }

  static getInstance() {
    if (!DiscordSvc.DiscordService.instance) {
      DiscordSvc.DiscordService.instance = new DiscordSvc.DiscordService();
    }
    return DiscordSvc.DiscordService.instance;
  }

  getAllBots() {
    return this.bots;
  }

  getClient() {
    return this.bots[0].client; // Default to first bot for compatibility
  }

  async initialize() {
    const log = DiscordDebug('app:discordService');
    for (const bot of this.bots) {
      bot.client.on('ready', () => {
        console.log(`Discord ${bot.botUserName} logged in as ${bot.client.user?.tag}`);
        bot.botUserId = bot.client.user?.id || '';
        log(`Initialized ${bot.botUserName} OK`);
      });

      bot.client.on('messageCreate', async (message: any) => {
        log(`Received message ${message.content} in ${message.channelId} from ${message.author.id}`);

        const isDirectlyAddressed = message.content.includes(bot.botUserId) || discordMsgConfig.get('MESSAGE_WAKEWORDS')?.split(',').some((w: any) => message.content.startsWith(w));
        if (!isDirectlyAddressed) return;

        const timingManager = require('@src/managers/TimingManager').TimingManager.getInstance();
        const greeting = `Greetings, <@${message.author.id}>! How can I assist?`;
        await timingManager.scheduleMessage(
          message.channelId,
          'cmd',
          message.content,
          message.author.id,
          async (text: any, threadId: any) => await this.sendMessageToChannel(message.channelId, `${greeting}\n${text}`, bot.botUserName, threadId),
          false
        );
      });

      await bot.client.login(this.tokens[this.bots.indexOf(bot)]);
      log(`Bot ${bot.botUserName} logged in`);
    }
  }

  setMessageHandler(handler: any) {
    this.bots.forEach(bot => bot.client.on('messageCreate', handler));
  }

  async sendMessageToChannel(channelId: any, text: any, senderName: any, threadId: any) {
    const log = DiscordDebug('app:discordService');
    const botInfo = this.bots.find(b => b.botUserName === senderName) || this.bots[0]; // Match by name or default to first
    try {
      console.log(`Sending to channel ${channelId} as ${botInfo.botUserName}`);
      const channel = await botInfo.client.channels.fetch(channelId);
      let message;

      if (!channel.isTextBased()) {
        throw new Error(`Channel ${channelId} is not text-based`);
      }

      if (threadId) {
        const thread = await botInfo.client.channels.fetch(threadId);
        if (!thread.isThread()) {
          throw new Error(`Thread ${threadId} is not a valid thread`);
        }
        message = await thread.send(`*${botInfo.botUserName}*: ${text}`);
      } else {
        console.log(`Attempting send to channel ${channelId}: *${botInfo.botUserName}*: ${text}`);
        message = await channel.send(`*${botInfo.botUserName}*: ${text}`);
      }

      console.log(`Sent message ${message.id} to channel ${channelId}${threadId ? `/${threadId}` : ''}`);
      return message.id;
    } catch (error: any) {
      console.log(`Error sending to ${channelId}${threadId ? `/${threadId}` : ''}: ${error.message}`);
      return '';
    }
  }

  async getMessagesFromChannel(channelId: any) {
    return await this.fetchMessages(channelId);
  }

  async fetchMessages(channelId: any) {
    const log = DiscordDebug('app:discordService');
    const botInfo = this.bots[0]; // Default to first bot for fetching
    try {
      const channel = await botInfo.client.channels.fetch(channelId);
      if (!channel.isTextBased()) {
        throw new Error('Channel is not text based');
      }
      const messages = await channel.messages.fetch({ limit: discordMsgConfig.get('DISCORD_MESSAGE_LIMIT') || 10 });
      return Array.from(messages.values());
    } catch (error: any) {
      console.log(`Failed to fetch messages from ${channelId}: ${error.message}`);
      return [];
    }
  }

  async sendPublicAnnouncement(channelId: any, announcement: any) {
    const text = `**Announcement**: ${announcement}`;
    await this.sendMessageToChannel(channelId, text, this.bots[0].botUserName, undefined);
  }

  getClientId() {
    return this.bots[0].botUserId || ''; // Default to first bot
  }

  getDefaultChannel() {
    return discordMsgConfig.get('DISCORD_DEFAULT_CHANNEL') || '';
  }

  async shutdown() {
    const log = DiscordDebug('app:discordService');
    for (const bot of this.bots) {
      await bot.client.destroy();
      log(`Bot ${bot.botUserName} shut down`);
    }
    DiscordSvc.DiscordService.instance = undefined;
  }

  getBotByName(name: any) {
    return this.bots.find(bot => bot.botUserName === name);
  }
};

module.exports = { Discord: DiscordSvc };
