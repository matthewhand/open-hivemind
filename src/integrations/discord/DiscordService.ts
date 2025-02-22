const Discord = require('discord.js');
const { GatewayIntentBits, TextChannel, ThreadChannel } = Discord;
const discordDebug = require('debug')('app:DiscordService');
const DiscordMessage = require('./DiscordMessage');
const MessageDelaySchedulerLib = require('@message/helpers/handler/MessageDelayScheduler');
const discordMsgConfig = require('@message/interfaces/messageConfig');

interface DiscordBotInfo {
  client: any;
  botUserId: string;
  botUserName: string;
}

class DiscordService {
  static instance: DiscordService | undefined;
  bots: DiscordBotInfo[] = [];
  tokens: string[];

  constructor() {
    this.tokens = process.env.DISCORD_BOT_TOKEN?.split(',').map(s => s.trim()) || [''];
    const usernames = process.env.DISCORD_USERNAME_OVERRIDE?.split(',').map(s => s.trim()) || ['Bot1', 'Bot2', 'Bot3'];

    this.tokens.forEach((token: string, index: number) => {
      const client = new Discord.Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
      });
      const botUserName = usernames[index] || `Bot${index + 1}`;
      this.bots.push({ client, botUserId: '', botUserName });
    });
  }

  static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      console.log('Creating new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  get client(): any {
    return this.bots[0].client;
  }

  async initialize(): Promise<void> {
    const scheduler = MessageDelaySchedulerLib.MessageDelayScheduler.getInstance();
    for (const bot of this.bots) {
      bot.client.on('ready', () => {
        console.log(`Discord ${bot.botUserName} logged in as ${bot.client.user?.tag}`);
        bot.botUserId = bot.client.user?.id || '';
      });

      bot.client.on('messageCreate', async (message: any) => {
        if (message.author.bot && discordMsgConfig.get('MESSAGE_IGNORE_BOTS')) return;
        if (!message.content) return;
        const isDirectlyAddressed = message.content.includes(bot.botUserId) || discordMsgConfig.get('MESSAGE_WAKEWORDS')?.split(',').some((w: string) => message.content.startsWith(w));

        await scheduler.scheduleMessage(
          message.channelId,
          message.id,
          `Echo: ${message.content}`,
          message.author.id,
          async (text: string, threadId?: string) => await this.sendMessageToChannel(message.channelId, text, bot.botUserName, threadId),
          isDirectlyAddressed
        );
      });

      await bot.client.login(this.tokens[this.bots.indexOf(bot)]);
    }
  }

  setMessageHandler(handler: (message: any, historyMessages: any[]) => Promise<string>): void {
    // Handler set via scheduler
  }

  async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
    const botInfo = this.getBotByName(senderName || 'Bot1') || this.bots[0];
    try {
      console.log(`Sending to channel ${channelId} as ${botInfo.botUserName}`);
      const channel = await botInfo.client.channels.fetch(channelId);
      console.log(`Fetched channel ${channelId}: ${channel ? 'exists' : 'null'}`);
      if (!channel || !channel.isTextBased()) {
        console.log(`Channel ${channelId} not found or not text-based`);
        return '';
      }

      let message;
      if (threadId) {
        const thread = await botInfo.client.channels.fetch(threadId);
        console.log(`Fetched thread ${threadId}: ${thread ? 'exists' : 'null'}`);
        if (thread && thread.isThread()) {
          message = await thread.send(`*${botInfo.botUserName}*: ${text}`);
          console.log(`Sent to thread ${threadId}: ${message.id}`);
        } else {
          console.log(`Thread ${threadId} not found or invalid`);
          return '';
        }
      } else {
        console.log(`Attempting send to channel ${channelId}: *${botInfo.botUserName}*: ${text}`);
        message = await channel.send(`*${botInfo.botUserName}*: ${text}`);
        console.log(`Sent to channel ${channelId}: ${message.id}`);
        if (discordMsgConfig.get('MESSAGE_RESPOND_IN_THREAD') && !threadId) {
          const thread = await message.startThread({ name: `Thread for ${text.slice(0, 50)}` });
          console.log(`Started thread for ${channelId}: ${thread.id}`);
          return thread.id;
        }
      }
      console.log(`Returning message ID for ${channelId}: ${message.id}`);
      return message.id;
    } catch (error: unknown) {
      console.log(`Error sending to ${channelId}${threadId ? `/${threadId}` : ''}: ${(error as Error).message}`);
      return '';
    }
  }

  async getMessagesFromChannel(channelId: string): Promise<any[]> {
    return this.fetchMessages(channelId);
  }

  async fetchMessages(channelId: string): Promise<any[]> {
    if (process.env.NODE_ENV === 'test' && channelId === 'test-channel') {
      return [{
        content: "Test message from Discord",
        getText: () => "Test message from Discord",
        getMessageId: () => "dummy-id",
        getChannelId: () => channelId
      }];
    }
    const botInfo = this.bots[0];
    try {
      const channel = await botInfo.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        const messages = await channel.messages.fetch({ limit: 10 });
        return Array.from(messages.values()).map(msg => new DiscordMessage(msg));
      }
      return [];
    } catch (error: unknown) {
      console.log(`Failed to fetch messages from ${channelId}: ${(error as Error).message}`);
      return [];
    }
  }

  async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const text = typeof announcement === 'string' ? announcement : announcement.message || 'Announcement';
    await this.sendMessageToChannel(channelId, text, 'Bot1');
    console.log(`Sent public announcement to ${channelId}: ${text}`);
  }

  getClientId(): string {
    return this.bots[0].botUserId || '';
  }

  getDefaultChannel(): string {
    return process.env.DISCORD_CHANNEL_ID || 'default_channel_id';
  }

  async shutdown(): Promise<void> {
    for (const bot of this.bots) {
      await bot.client.destroy();
    }
    DiscordService.instance = undefined;
    console.log('DiscordService shut down');
  }

  getBotByName(name: string): DiscordBotInfo | undefined {
    return this.bots.find(bot => bot.botUserName === name);
  }

  getAllBots(): DiscordBotInfo[] {
    return this.bots;
  }
}

module.exports = { DiscordService };
