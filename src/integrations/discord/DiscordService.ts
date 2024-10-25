import { 
  Client, Message, EmbedBuilder, PartialGroupDMChannel, 
  TextChannel, DMChannel, GatewayIntentBits 
} from "discord.js";
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';
import { debugPermissions } from '@src/integrations/discord/guild/debugPermissions';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import fs from 'fs';

const log = Debug('app:discord-service');
const discordLogFile = './discord_message.log';
const filteredChannelId = discordConfig.get('DISCORD_CHANNEL_ID') || '';

log(`Filtered Channel ID: ${filteredChannelId}`);

/**
 * DiscordService Class
 * Manages interaction with the Discord API, including message handling, 
 * authentication, and other operations. Implements the IMessengerService interface.
 */
export class DiscordService implements IMessengerService {
  public client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;

  /** Retrieves the bot's client ID */
  getClientId(): string {
    return discordConfig.get('DISCORD_CLIENT_ID');
  }

  // Private constructor to enforce the singleton pattern
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

  /** Retrieves the singleton instance of DiscordService. */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  /** Sets a custom message handler for processing Discord messages. */
  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => void): void {
    this.messageHandler = handler;
  }

  /** Initializes the Discord client and logs in using the configured token. */
  public async initialize(token?: string): Promise<void> {
    try {
      token = token || (discordConfig.get('DISCORD_BOT_TOKEN') as string);

      if (!token) {
        throw new Error('DISCORD_BOT_TOKEN is not set');
      }
      log(`Initializing bot with token: ${token ? 'token set' : 'no token found'}`);

      await this.client.login(token);
      this.client.once('ready', async () => {
        const botClientId = this.client.user?.id;
        if (botClientId) {
          log(`Logged in as ${this.client.user?.tag}! Client ID: ${botClientId}`);
        }
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
          try {
            fs.appendFileSync(discordLogFile, `Message: ${JSON.stringify(message)}\n`);
          } catch (error: any) {
            log(`Failed to log message: ${error.message}`);
          }

          const channelId = message.channelId;
          log(`Extracted channelId: ${channelId}`);

          const historyMessages = await this.getMessagesFromChannel(channelId, 10);
          try {
            fs.appendFileSync(discordLogFile, `History: ${JSON.stringify(historyMessages)}\n`);
          } catch (error: any) {
            log(`Failed to log message history: ${error.message}`);
          }

          const iMessage: IMessage = new DiscordMessage(message);
          try {
            fs.appendFileSync(discordLogFile, `Converted to IMessage: ${JSON.stringify(iMessage)}\n`);
          } catch (error: any) {
            log(`Failed to log IMessage: ${error.message}`);
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

  /** Sends a message to a specific Discord channel. */
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

  /** Fetches messages from a specific channel. */
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

  /** Sends a public announcement using an embedded message. */
  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    if (!this.client) throw new Error('Discord client is not initialized');

    const embed = new EmbedBuilder()
      .setTitle(announcement.title || '📢 Public Announcement')
      .setDescription(announcement.description || 'No description provided')
      .setColor(announcement.color || '#0099ff')
      .setTimestamp();

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!(channel instanceof TextChannel || channel instanceof DMChannel)) {
        throw new Error('Unsupported channel type.');
      }
      await channel.send({ embeds: [embed] });
      log(`Announcement sent to channel ${channelId}`);
    } catch (error: any) {
      log(`Failed to send announcement: ${error.message}`);
      throw error;
    }
  }
}
