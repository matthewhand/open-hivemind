import { Client, Message } from 'discord.js';
import { initializeClient } from './interaction/initializeClient';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';  // Reusing utility
import { debugPermissions } from '@src/integrations/discord/guild/debugPermissions';  // Use correct named import
import discordConfig from '@integrations/discord/interfaces/discordConfig';  // Using convict for config

const log = Debug('app:discord-service');

/**
 * DiscordService Class
 * 
 * This service handles interactions with the Discord API, managing message handling,
 * user authentication, and other Discord-related operations. It ensures communication
 * with Discord servers via the Discord.js library and provides methods for sending messages,
 * fetching message history, and setting up custom message handlers.
 */
export class DiscordService {
  private client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage) => void) | null = null;

  // Private constructor to enforce singleton pattern
  private constructor() {
    log('Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
    this.client = initializeClient();
    log('Client initialized successfully');
  }

  /**
   * Retrieves the singleton instance of DiscordService.
   * Ensures that only one instance of this service is created and used across the application.
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  /**
   * Sets a custom message handler for processing incoming Discord messages.
   * 
   * @param handler - A function that processes IMessage objects.
   */
  public setMessageHandler(handler: (message: IMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initializes the Discord client and logs in using the provided or configured token.
   * Once logged in, the client will listen for messages and trigger the custom message handler if set.
   * 
   * @param token - Optional bot token to override the config value.
   */
  public async initialize(token?: string): Promise<void> {
    try {
      // Retrieve the token from the configuration file using discordConfig (Convict)
      token = token || discordConfig.get('DISCORD_BOT_TOKEN') as string;

      if (!token) {
        throw new Error('DISCORD_BOT_TOKEN is not set');
      }
      log(`Initializing bot with token: ${token ? 'token set' : 'no token found'}`);  // Improvement: Log token status

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
        this.client.on('messageCreate', (message: Message) => {
          log(`Received a message with ID: ${message.id}`);
          const iMessage: IMessage = new DiscordMessage(message);
          this.messageHandler!(iMessage);  // Invoke the custom message handler
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
}
