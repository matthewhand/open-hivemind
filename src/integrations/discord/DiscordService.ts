import { 
  Client, Message, EmbedBuilder, PartialGroupDMChannel, 
  TextChannel, DMChannel, GatewayIntentBits 
} from 'discord.js';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { debugPermissions } from '@src/integrations/discord/guild/debugPermissions';
import { sendPublicAnnouncement } from '@src/integrations/discord/interaction/sendPublicAnnouncement';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import messageConfig from '@message/interfaces/messageConfig';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import fs from 'fs';

const log = Debug('app:discord-service');
const discordLogFile = './discord_message.log';
const filteredChannelId = discordConfig.get('DISCORD_CHANNEL_ID') || '';
const loggingEnabled = discordConfig.get('DISCORD_LOGGING_ENABLED');

log(`Filtered Channel ID: ${filteredChannelId}`);
log(`Logging Enabled: ${loggingEnabled}`);

/**
 * DiscordService Class
 * Manages interaction with the Discord API, including message handling,
 * authentication, and other operations. Implements the IMessengerService interface.
 */
export class DiscordService implements IMessengerService {
  public client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;
  private botUserId: string | null = null;  // Dynamically populated bot user ID

  private constructor() {
    log('Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });
    this.initialize();
    log('Client initialized successfully');
  }

  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => void): void {
    this.messageHandler = handler;
  }

  public async initialize(token?: string): Promise<void> {
    try {
      token = token || (discordConfig.get('DISCORD_BOT_TOKEN') as string);

      if (!token) {
        throw new Error('DISCORD_BOT_TOKEN is not set');
      }
      log(`Initializing bot with token: ${token ? 'token set' : 'no token found'}`);

      await this.client.login(token);
      this.client.once('ready', async () => {
        this.botUserId = this.client.user?.id || null;
        log(`Logged in as ${this.client.user?.tag}! Client ID: ${this.botUserId}`);

        await debugPermissions(this.client); // Check the bot's permissions
      });

      if (this.messageHandler) {
        log('Setting up custom message handler');
        this.client.on('messageCreate', async (message: Message) => {
          log(`Incoming Message Channel ID: ${message.channel.id}`);

          if (filteredChannelId && message.channel.id !== filteredChannelId) {
            log('Message ignored: Not from the configured channel.');
            return;
          }

          if (message.partial) {
            try {
              message = await message.fetch();
              log('Fetched full message:', message);
            } catch (error) {
              log('Error fetching full message:', error);
              return;
            }
          }

          log(`Received a message with ID: ${message.id}`);
          if (loggingEnabled) {
            fs.appendFileSync(discordLogFile, `Message: ${JSON.stringify(message)}\n`);
          }

          const isMentioned = this.isBotMentioned(message);
          log(`Bot mentioned: ${isMentioned}`);

          const historyLimit = messageConfig.get('MESSAGE_HISTORY_LIMIT') || 10;
          const historyMessages = await this.getMessagesFromChannel(message.channelId, historyLimit);
          log(`Fetched ${historyMessages.length} messages from channel ${message.channelId}`);

          if (loggingEnabled) {
            fs.appendFileSync(discordLogFile, `History: ${JSON.stringify(historyMessages)}\n`);
          }

          const iMessage: IMessage = new DiscordMessage(message);
          if (loggingEnabled) {
            try {
              fs.appendFileSync(discordLogFile, `Converted to IMessage: ${JSON.stringify(iMessage)}\n`);
            } catch (error: any) {
              log(`Failed to log IMessage: ${error.message}`);
            }
          }

          this.messageHandler!(iMessage, historyMessages);
        });
      } else {
        log('No custom message handler set');
      }
    } catch (error: any) {
      log('Failed to start DiscordService:', error.message);
      log(error.stack);
      process.exit(1);
    }
  }

  private isBotMentioned(message: Message): boolean {
    if (!this.botUserId) return false;
    return message.mentions.has(this.botUserId);
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    await sendPublicAnnouncement(channelId, announcement);
  }

  public getClientId(): string {
    return this.botUserId || 'unknown-client-id';
  }

  public async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    if (!this.client) {
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }

    try {
      log(`Sending message to channel ${channelId}: ${message}`);
      const channel = await this.client.channels.fetch(channelId);
      if (!(channel instanceof TextChannel || channel instanceof DMChannel)) {
        throw new Error('Unsupported channel type.');
      }
      await channel.send(message);
      log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
      log(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<IMessage[]> {
    if (!this.client) {
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }

    try {
      log(`Fetching ${limit} messages from channel ${channelId}`);
      const channel = await this.client.channels.fetch(channelId);
      if (!(channel instanceof TextChannel || channel instanceof DMChannel)) {
        throw new Error('Unsupported channel type.');
      }
      const messages = await channel.messages.fetch({ limit });
      return messages.map((msg) => new DiscordMessage(msg));
    } catch (error: any) {
      log(`Failed to fetch messages: ${error.message}`);
      throw error;
    }
  }
}
