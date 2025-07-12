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
      const tokenString = process.env.DISCORD_BOT_TOKEN || 'NO_TOKEN';
      this.tokens = tokenString.split(',').map((t) => t.trim());
      
      // Validate we have at least one token
      if (this.tokens.length === 0 || this.tokens[0] === 'NO_TOKEN') {
        throw new Error('No Discord bot tokens provided in DISCORD_BOT_TOKEN');
      }

      const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';

      const intents = [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ];

      // Create bot instances with unique names and tokens
      this.tokens.forEach((token, index) => {
        if (!token) {
          throw new Error(`Empty token at position ${index + 1} in DISCORD_BOT_TOKEN`);
        }

        const botUserName = `${displayName} #${index + 1}`;
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

    public getClient(index = 0): Client {
      return this.bots[index]?.client || this.bots[0].client;
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

      this.bots.forEach((bot) => {
        bot.client.on('messageCreate', async (message) => {
          if (message.author.bot) return;

          const wrappedMessage = new DiscordMessage(message);
          const history = await this.getMessagesFromChannel(message.channelId);
          await handler(wrappedMessage, history);
        });
      });
    }

    /**
     * Sends a message to a Discord channel using the specified bot instance
     * @param channelId The target channel ID
     * @param text The message text to send
     * @param senderName Optional bot instance name (e.g. "Madgwick AI #2")
     * @param threadId Optional thread ID if sending to a thread
     * @returns The message ID or empty string on failure
     * @throws Error if no bots are available
     */
    public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
      if (this.bots.length === 0) {
        throw new Error('No Discord bot instances available');
      }

      const displayName = messageConfig.get('MESSAGE_USERNAME_OVERRIDE') || 'Madgwick AI';
      const effectiveSender = senderName || displayName;
      
      // Find bot by name or use first bot as fallback
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
