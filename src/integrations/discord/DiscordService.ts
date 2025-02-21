import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import Debug from 'debug';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import DiscordMessage from './DiscordMessage';
import { handleMessage } from '@message/handlers/messageHandler';
import messageConfig from '@message/interfaces/messageConfig'; // Correct path

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
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildVoiceStates,
        ],
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
    return this.bots[0].client; // Default client for compatibility
  }

  public async initialize(): Promise<void> {
    for (const bot of this.bots) {
      bot.client.on('ready', () => {
        debug(`Discord ${bot.botUserName} logged in as ${bot.client.user?.tag}`);
        bot.botUserId = bot.client.user?.id || '';
      });

      bot.client.on('messageCreate', async (message) => {
        if (message.author.bot && messageConfig.get('MESSAGE_IGNORE_BOTS')) return;
        if (!message.content) return;
        const discordMessage = new DiscordMessage(message);
        const historyMessages: IMessage[] = await this.getMessagesFromChannel(message.channelId);
        await handleMessage(discordMessage, historyMessages);
      });

      await bot.client.login(this.tokens[this.bots.indexOf(bot)]);
    }
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>) {
    // Handler set in messageCreate event via handleMessage
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string): Promise<void> {
    const botInfo = this.getBotByName(senderName || 'Bot1') || this.bots[0];
    try {
      const channel = await botInfo.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).send(`*${botInfo.botUserName}*: ${text}`);
        debug(`Sent message to Discord channel ${channelId} as ${botInfo.botUserName}: ${text}`);
      } else {
        debug(`Channel ${channelId} not found or not text-based`);
      }
    } catch (error) {
      debug(`Failed to send message to ${channelId}: ${(error as Error).message}`);
    }
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    return this.fetchMessages(channelId);
  }

  public async fetchMessages(channelId: string): Promise<IMessage[]> {
    const botInfo = this.bots[0]; // Default to first bot for simplicity
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
    await this.sendMessageToChannel(channelId, text, 'Bot1'); // Default to first bot
    debug(`Sent public announcement to ${channelId}: ${text}`);
  }

  public getClientId(): string {
    return this.bots[0].botUserId || ''; // Default to first bot
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
