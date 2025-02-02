// src/integrations/discord/DiscordService.ts

/**
 * DiscordService.ts
 *
 * This module manages interactions with the Discord API, including message handling,
 * sending messages, rate limiting, and monitoring events. Implements the IMessengerService interface.
 */

import { 
  Client, 
  Message as DiscordMessageType, 
  GatewayIntentBits, 
  TextChannel, 
  DMChannel 
} from 'discord.js';
import DiscordMessage from './DiscordMessage';
import Debug from 'debug';
import { debugPermissions } from './guild/debugPermissions';
import { sendPublicAnnouncement } from './interaction/sendPublicAnnouncement';
import discordConfig from './interfaces/discordConfig';
import { IMessage } from '@message/interfaces/IMessage';
import messageConfig from '@src/message/interfaces/messageConfig';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import { ChatHistory } from '@src/message/common/chatHistory';
import fs from 'fs';
import path from 'path';

const log = Debug('app:discord-service');
const discordLogFile = path.join(__dirname, '../../logs/discord_message.log'); // Ensure logs directory exists
const filteredChannelId = discordConfig.get('DISCORD_CHANNEL_ID') || '';
const loggingEnabled = discordConfig.get('DISCORD_LOGGING_ENABLED');

// Ensure logging directory exists
if (loggingEnabled && !fs.existsSync(path.dirname(discordLogFile))) {
  fs.mkdirSync(path.dirname(discordLogFile), { recursive: true });
}

log(`Filtered Channel ID: ${filteredChannelId}`);
log(`Logging Enabled: ${loggingEnabled}`);

/**
 * DiscordService Class
 * Manages interaction with the Discord API, including message handling,
 * authentication, rate limiting, and other operations. Implements the IMessengerService interface.
 */
export class DiscordService implements IMessengerService {
  public client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;
  private botUserId: string | null = null;  // Dynamically populated bot user ID
  private chatHistory: ChatHistory;
  private historyLimit: number;
  private rateLimitPerChannel: number;
  private messageTimestamps: Record<string, number[]> = {}; // For rate limiting

  private constructor() {
    log('Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates, MessageContent');
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent // Ensure MessageContent intent is enabled if needed
      ],
    });
    this.chatHistory = ChatHistory.getInstance();
    this.historyLimit = messageConfig.get('MESSAGE_HISTORY_LIMIT') || 10;
    this.rateLimitPerChannel = messageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL') || 5;
    this.initialize();
    log('Client initialized successfully');
  }

  /**
   * Singleton pattern to ensure only one instance of DiscordService exists.
   * @returns {DiscordService} The single instance.
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  /**
   * Sets the custom message handler function.
   * @param {Function} handler - The message handler function.
   */
  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initializes the Discord client, sets up event listeners, and logs in.
   * @param {string} [token] - Optional Discord bot token.
   */
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
        this.client.on('messageCreate', async (message: DiscordMessageType) => {
          log(`Incoming Message Channel ID: ${message.channel.id}`);

          // Filter messages from specific channel if configured
          if (filteredChannelId && message.channel.id !== filteredChannelId) {
            log('Message ignored: Not from the configured channel.');
            return;
          }

          // Ignore messages from other bots if configured
          if (message.author.bot && messageConfig.get('MESSAGE_IGNORE_BOTS')) {
            log(`Ignored message from bot: ${message.author.id}`);
            return;
          }

          if (message.partial) {
            try {
              message = await message.fetch();
              log('Fetched full message:', message.id);
            } catch (error: any) {
              log('Error fetching full message:', error.message);
              return;
            }
          }

          log(`Received a message with ID: ${message.id}`);
          if (loggingEnabled) {
            fs.appendFileSync(discordLogFile, `Message: ${JSON.stringify(message)}\n`);
          }

          // Convert DiscordMessageType to IMessage
          const iMessage: IMessage = new DiscordMessage(message);

          // Add message to chat history
          this.chatHistory.addMessage(iMessage);

          // Retrieve recent message history based on configurable limit
          const historyMessages: IMessage[] = this.chatHistory.getRecentMessages(this.historyLimit);
          log(`Fetched ${historyMessages.length} messages from channel ${message.channel.id}`);

          if (loggingEnabled) {
            fs.appendFileSync(discordLogFile, `History: ${JSON.stringify(historyMessages)}\n`);
          }

          if (loggingEnabled) {
            try {
              fs.appendFileSync(discordLogFile, `Converted to IMessage: ${JSON.stringify(iMessage)}\n`);
            } catch (error: any) {
              log(`Failed to log IMessage: ${error.message}`);
            }
          }

          // Rate Limiting: Check if channel is rate-limited
          if (this.isRateLimited(message.channel.id)) {
            log(`Channel ${message.channel.id} is rate-limited. Message not processed.`);
            return;
          }

          // Handle the incoming message
          this.messageHandler!(iMessage, historyMessages);

          // Record the message timestamp for rate limiting
          this.recordMessageTimestamp(message.channel.id);
        });
      } else {
        log('No custom message handler set');
      }

      // Handle client errors
      this.client.on('error', (error) => {
        log(`Discord client error: ${error.message}`);
        // Optionally implement reconnection logic or notifications
      });

    } catch (error: any) {
      log('Failed to start DiscordService:', error.message);
      log(error.stack);
      process.exit(1); // Exit process if Discord client fails to start
    }
  }

  /**
   * Sends a public announcement to a specified Discord channel.
   * @param {string} channelId - The ID of the channel to send the announcement to.
   * @param {any} announcement - The announcement content.
   * @returns {Promise<void>} Resolves when the announcement is sent.
   */
  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    await sendPublicAnnouncement(channelId, announcement);
  }

  /**
   * Retrieves the bot's client ID.
   * @returns {string} The bot's client ID.
   */
  public getClientId(): string {
    return this.botUserId || '';
  }

  /**
   * Sends a message to a specified Discord channel.
   * @param {string} channelId - The ID of the channel to send the message to.
   * @param {string} message - The content of the message.
   * @returns {Promise<void>} Resolves when the message is sent.
   */
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
      log(`Failed to send message to channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves recent messages from a specified Discord channel.
   * @param {string} channelId - The ID of the channel to fetch messages from.
   * @param {number} [limit=10] - The number of recent messages to retrieve.
   * @returns {Promise<IMessage[]>} An array of IMessage instances.
   */
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
      log(`Failed to fetch messages from channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Records the timestamp of a sent message for rate limiting.
   * @param {string} channelId - The ID of the channel.
   */
  private recordMessageTimestamp(channelId: string): void {
    const currentTime = Date.now();
    if (!this.messageTimestamps[channelId]) {
      this.messageTimestamps[channelId] = [];
    }
    this.messageTimestamps[channelId].push(currentTime);
    // Remove timestamps older than 60 seconds
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId].filter(
      (timestamp) => currentTime - timestamp <= 60000
    );
    log(`Recorded message timestamp for channel ${channelId}. Total in last minute: ${this.messageTimestamps[channelId].length}`);
  }

  /**
   * Checks if the channel is rate-limited based on recent message timestamps.
   * @param {string} channelId - The ID of the channel.
   * @returns {boolean} True if rate-limited, else false.
   */
  private isRateLimited(channelId: string): boolean {
    const currentTime = Date.now();
    if (!this.messageTimestamps[channelId]) {
      this.messageTimestamps[channelId] = [];
      return false;
    }

    // Remove timestamps older than 60 seconds
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId].filter(
      (timestamp) => currentTime - timestamp <= 60000
    );

    const isLimited = this.messageTimestamps[channelId].length >= this.rateLimitPerChannel;
    if (isLimited) {
      log(`Channel ${channelId} has reached the rate limit of ${this.rateLimitPerChannel} messages per minute.`);
    }

    return isLimited;
  }

  /**
   * Gracefully shuts down the Discord client.
   */
  public async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      log('Discord client has been shut down.');
    }
  }
}
