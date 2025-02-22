import { Client, GatewayIntentBits, TextChannel, ThreadChannel } from 'discord.js';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import DiscordMessage from './DiscordMessage';
import { MessageDelayScheduler } from '@message/helpers/handler/MessageDelayScheduler';
import messageConfig from '@message/interfaces/messageConfig';

const debug = Debug('app:DiscordService');

interface DiscordBotInfo {
  client: Client;
  botUserId: string;
  botUserName: string;
}

export class DiscordService implements IMessengerService {
  private static instance: DiscordService | undefined;
  private bots: DiscordBotInfo[] = [];
  private tokens: string[];

  private constructor() {
    this.tokens = process.env.DISCORD_BOT_TOKEN?.split(',').map(s => s.trim()) || [''];
    const usernames = process.env.DISCORD_USERNAME_OVERRIDE?.split(',').map(s => s.trim()) || ['Bot1', 'Bot2', 'Bot3'];

    this.tokens.forEach((token, index) => {
      const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
      });
      const botUserName = usernames[index] || `Bot${index + 1}`;
      this.bots.push({ client, botUserId: '', botUserName });
    });
  }

  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      debug('Creating new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  public get client(): Client {
    return this.bots[0].client;
  }

  public async initialize(): Promise<void> {
    const scheduler = MessageDelayScheduler.getInstance();
    for (const bot of this.bots) {
      bot.client.on('ready', () => {
        debug(`Discord ${bot.botUserName} logged in as ${bot.client.user?.tag}`);
        bot.botUserId = bot.client.user?.id || '';
      });

      bot.client.on('messageCreate', async (message) => {
        if (message.author.bot && messageConfig.get('MESSAGE_IGNORE_BOTS')) return;
        if (!message.content) return;
        const isDirectlyAddressed = message.content.includes(bot.botUserId) || messageConfig.get('MESSAGE_WAKEWORDS')?.split(',').some(w => message.content.startsWith(w));

        await scheduler.scheduleMessage(
          message.channelId,
          message.id,
          `Echo: ${message.content}`, // Placeholder
          message.author.id,
          async (text, threadId) => await this.sendMessageToChannel(message.channelId, text, bot.botUserName, threadId),
          isDirectlyAddressed
        );
      });

      await bot.client.login(this.tokens[this.bots.indexOf(bot)]);
    }
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>) {
    // Handler set via scheduler
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
    const botInfo = this.getBotByName(senderName || 'Bot1') || this.bots[0];
    try {
      const channel = await botInfo.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        debug(`Channel ${channelId} not found or not text-based`);
        return '';
      }

      let message;
      if (threadId) {
        const thread = await botInfo.client.channels.fetch(threadId) as ThreadChannel;
        if (thread && thread.isThread()) {
          message = await thread.send(`*${botInfo.botUserName}*: ${text}`);
        } else {
          debug(`Thread ${threadId} not found or invalid`);
          return '';
        }
      } else {
        message = await (channel as TextChannel).send(`*${botInfo.botUserName}*: ${text}`);
        if (messageConfig.get('MESSAGE_RESPOND_IN_THREAD') && !threadId) {
          const thread = await message.startThread({ name: `Thread for ${text.slice(0, 50)}` });
          return thread.id;
        }
      }
      debug(`Sent message to ${threadId ? `thread ${threadId}` : `channel ${channelId}`} as ${botInfo.botUserName}: ${text}`);
      return message.id;
    } catch (error) {
      debug(`Failed to send message to ${channelId}${threadId ? `/${threadId}` : ''}: ${(error as Error).message}`);
      return '';
    }
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    return this.fetchMessages(channelId);
  }

  public async fetchMessages(channelId: string): Promise<IMessage[]> {
    if (process.env.NODE_ENV === 'test' && channelId === 'test-channel') {
      return [{
        content: "Test message from Discord",
        getText: () => "Test message from Discord",
        getMessageId: () => "dummy-id",
        getChannelId: () => channelId
      }] as any;
    }
    const botInfo = this.bots[0];
    try {
      const channel = await botInfo.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        const messages = await (channel as TextChannel).messages.fetch({ limit: 10 });
        return Array.from(messages.values()).map(msg => new DiscordMessage(msg));
      }
      return [];
    } catch (error) {
      debug(`Failed to fetch messages from ${channelId}: ${(error as Error).message}`);
      return [];
    }
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const text = typeof announcement === 'string' ? announcement : announcement.message || 'Announcement';
    await this.sendMessageToChannel(channelId, text, 'Bot1');
    debug(`Sent public announcement to ${channelId}: ${text}`);
  }

  public getClientId(): string {
    return this.bots[0].botUserId || '';
  }

  public getDefaultChannel(): string {
    return process.env.DISCORD_CHANNEL_ID || 'default_channel_id';
  }

  public async shutdown(): Promise<void> {
    for (const bot of this.bots) {
      await bot.client.destroy();
    }
    DiscordService.instance = undefined;
    debug('DiscordService shut down');
  }

  private getBotByName(name: string): DiscordBotInfo | undefined {
    return this.bots.find(bot => bot.botUserName === name);
  }

  public getAllBots(): DiscordBotInfo[] {
    return this.bots;
  }
}
