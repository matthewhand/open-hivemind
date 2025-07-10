import { Client, GatewayIntentBits, Message, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import Debug from 'debug';
import discordConfig from '@config/discordConfig';
import messageConfig from '@config/messageConfig';
import DiscordMessage from './DiscordMessage';
import { IMessage } from '@message/interfaces/IMessage';
import { IMessengerService } from '@message/interfaces/IMessengerService';

const log = Debug('app:discordService');

interface Bot {
  client: Client;
  botUserId: string;
  botUserName: string;
}

export const Discord = {
  DiscordService: class implements IMessengerService {
    private static instance: DiscordService;
    private bots: Bot[];
    private tokens: string[];
    private handlerSet: boolean = false;

    public constructor() {
      this.bots = [];
      this.tokens = (process.env.DISCORD_BOT_TOKEN || 'NO_TOKEN').split(',').map((t) => t.trim());
      const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';

      const intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ];

      this.tokens.forEach((token) => {
        const botUserName = displayName; // Use env var directly
        const client = new Client({ intents });
        this.bots.push({ client, botUserId: '', botUserName });
      });
    }

    public static getInstance(): DiscordService {
      if (!Discord.DiscordService.instance) {
        Discord.DiscordService.instance = new Discord.DiscordService();
      }
      return Discord.DiscordService.instance;
    }

    public getAllBots(): Bot[] {
      return this.bots;
    }

    public getClient(): Client {
      return this.bots[0].client;
    }

    public async initialize(): Promise<void> {
      const loginPromises = this.bots.map((bot, index) => {
        return new Promise<void>(async (resolve) => {
          bot.client.once('ready', () => {
            console.log(`Discord ${bot.botUserName} logged in as ${bot.client.user?.tag}`);
            bot.botUserId = bot.client.user?.id || '';
            log(`Initialized ${bot.botUserName} OK`);
            resolve();
          });

          await bot.client.login(this.tokens[index]);
          log(`Bot ${bot.botUserName} logged in`);
        });
      });

      await Promise.all(loginPromises);
    }

    public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => Promise<string>): void {
      if (this.handlerSet) return;
      this.handlerSet = true;

      this.bots[0].client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const wrappedMessage = new DiscordMessage(message);
        const history = await this.getMessagesFromChannel(message.channelId);
        await handler(wrappedMessage, history);
      });
    }

    public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
      const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
      const effectiveSender = senderName || displayName;
      const botInfo = this.bots.find((b) => b.botUserName === effectiveSender) || this.bots[0];
      try {
        console.log(`Sending to channel ${channelId} as ${effectiveSender}`);
        const channel = await botInfo.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          throw new Error(`Channel ${channelId} is not text-based or was not found`);
        }

        let message;
        if (threadId) {
          const thread = await botInfo.client.channels.fetch(threadId);
          if (!thread || !thread.isThread()) {
            throw new Error(`Thread ${threadId} is not a valid thread or was not found`);
          }
          message = await thread.send(text);
        } else {
          console.log(`Attempting send to channel ${channelId}: *${effectiveSender}*: ${text}`);
          message = await (channel as TextChannel | NewsChannel | ThreadChannel).send(text);
        }

        console.log(`Sent message ${message.id} to channel ${channelId}${threadId ? `/${threadId}` : ''}`);
        return message.id;
      } catch (error: any) {
        console.log(`Error sending to ${channelId}${threadId ? `/${threadId}` : ''}: ${error.message}`);
        return '';
      }
    }

    public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
      const rawMessages = await this.fetchMessages(channelId);
      return rawMessages.map(msg => new DiscordMessage(msg));
    }

    public async fetchMessages(channelId: string): Promise<Message[]> {
      const botInfo = this.bots[0];
      try {
        const channel = await botInfo.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          throw new Error('Channel is not text-based or was not found');
        }
        const limit = (discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
        const messages = await channel.messages.fetch({ limit });
        return Array.from(messages.values());
      } catch (error: any) {
        console.log(`Failed to fetch messages from ${channelId}: ${error.message}`);
        return [];
      }
    }

    public async sendPublicAnnouncement(channelId: string, announcement: string): Promise<void> {
      const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
      const text = `**Announcement**: ${announcement}`;
      await this.sendMessageToChannel(channelId, text, displayName, undefined);
    }

    public getClientId(): string {
      return this.bots[0].botUserId || '';
    }

    public getDefaultChannel(): string {
      return (discordConfig.get('DISCORD_DEFAULT_CHANNEL_ID') as string | undefined) || '';
    }

    public async shutdown(): Promise<void> {
      for (const bot of this.bots) {
        await bot.client.destroy();
        log(`Bot ${bot.botUserName} shut down`);
      }
      Discord.DiscordService.instance = undefined as any;
    }

    public getBotByName(name: string): Bot | undefined {
      return this.bots.find((bot) => bot.botUserName === name);
    }
  }
};

type DiscordService = InstanceType<typeof Discord.DiscordService>;
