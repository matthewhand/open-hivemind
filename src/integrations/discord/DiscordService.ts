import { Client, Message, EmbedBuilder } from 'discord.js';
import { initializeClient } from './interaction/initializeClient';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';
import { debugPermissions } from '@src/integrations/discord/guild/debugPermissions';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import fs from 'fs';  // For writing logs to a file

const log = Debug('app:discord-service');
const discordLogFile = './discord_message.log';

/**
 * DiscordService Class
 * 
 * This service handles interactions with the Discord API, managing message handling,
 * user authentication, and other Discord-related operations. It implements IMessengerService.
 */
export class DiscordService implements IMessengerService {
  private client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;

  // Private constructor to enforce singleton pattern
  private constructor() {
    log('Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
    this.client = initializeClient();
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

  /** Sets a custom message handler for processing incoming Discord messages. */
  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => void): void {
    this.messageHandler = handler;
  }

  /** Initializes the Discord client and logs in using the provided or configured token. */
  public async initialize(token?: string): Promise<void> {
    try {
      token = token || discordConfig.get('DISCORD_BOT_TOKEN') as string;

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

        await debugPermissions(this.client);  // Debug the bot's permissions in the guild
      });

      if (this.messageHandler) {
        log('Setting up custom message handler');
        this.client.on('messageCreate', async (message: Message) => {
          log(`Received a message with ID: ${message.id}`);
          try {
            fs.appendFileSync(discordLogFile, `Full message object: ${JSON.stringify(message, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2)}\n`);
          } catch (error: any) {
            log(`Failed to log message details to ${discordLogFile}:`, error.message);
          }

          // Fetch message history (last 10 messages)
          const channelId = message.channelId;
          const historyMessages = await this.getMessagesFromChannel(channelId, 10);

          try {
            fs.appendFileSync(discordLogFile, `Fetched message history: ${JSON.stringify(historyMessages, null, 2)}\n`);
          } catch (error: any) {
            log(`Failed to log message history to ${discordLogFile}:`, error.message);
          }

          const iMessage: IMessage = new DiscordMessage(message);
          try {
            fs.appendFileSync(discordLogFile, `Converted to IMessage: ${JSON.stringify(iMessage, null, 2)}\n`);
          } catch (error: any) {
            log(`Failed to log IMessage to ${discordLogFile}:`, error.message);
          }

          // Call the handler with history messages
          this.messageHandler!(iMessage, historyMessages);
        });
      } else {
        log('No custom message handler set');
      }
    } catch (error: any) {
      log('Failed to start DiscordService: ' + error.message);
      log(error.stack);
      process.exit(1);  // Exit the process on failure
    }
  }

  /**
   * Sends a message to a specified Discord channel.
   * 
   * @param channelId - The ID of the Discord channel.
   * @param message - The message content to send to the channel.
   */
  public async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    if (!this.client) {  // Improvement: Guard clause
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }

    try {
      log(`Sending message to channel ${channelId}: ${message}`);
      await sendMessageToChannel(this.client, channelId, message);  // Use sendMessageToChannel utility
      log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
      log(`Failed to send message to channel ${channelId}: ` + error.message);
      log(error.stack);
      throw error;
    }
  }

  /**
   * Fetches a number of messages from a specified Discord channel.
   * 
   * @param channelId - The ID of the Discord channel to fetch messages from.
   * @param limit - The number of messages to fetch (defaults to 10).
   * @returns {Promise<IMessage[]>} - Returns a Promise that resolves to an array of IMessage objects.
   */
  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<IMessage[]> {
    if (!this.client) {  // Improvement: Guard clause
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }

    try {
      log(`Fetching up to ${limit} messages from channel ${channelId}`);
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {  // Fix: Replacing deprecated method isText()
        throw new Error(`Channel ${channelId} not found or is not a text-based channel.`);
      }

      const fetchedMessages = await channel.messages.fetch({ limit });
      return fetchedMessages.map((msg) => new DiscordMessage(msg));  // Convert messages to IMessage format
    } catch (error: any) {
      log(`Failed to fetch messages from channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends a public service announcement to a channel using an embed.
   * 
   * @param channelId - The ID of the Discord channel.
   * @param announcement - The announcement content, which will be styled using an embed.
   */
  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    if (!this.client) {
      throw new Error('Discord client is not initialized');
    }

    const embed = new EmbedBuilder()
      .setTitle(announcement.title || '📢 Public Announcement')
      .setDescription(announcement.description || 'No description provided')
      .setColor(announcement.color || '#0099ff')
      .setTimestamp();

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel?.isTextBased()) {
        throw new Error('Channel is not text-based or does not exist');
      }

      await channel.send({ embeds: [embed] });
      log(`Public announcement sent to channel ${channelId}`);
    } catch (error: any) {
      log(`Failed to send public announcement: ${error.message}`);
      throw error;
    }
  }
}
