import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';
import { debugPermissions } from '@src/integrations/discord/guild/debugPermissions';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import { shouldProcessMessage } from '@src/message/helpers/processing/shouldProcessMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import { Client, EmbedBuilder, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import debug from 'debug';

const log = debug('app:discord-service');
const discordLogFile = './discord_message.log';

/**
 * Initializes the Discord client with necessary intents.
 */
export function initializeClient(): Client {
    return new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildVoiceStates,
        ],
    });
}

/**
 * DiscordService Class
 *
 * This service manages the interaction with the Discord API, including message handling,
 * user authentication, and other Discord-related operations. Implements the IMessengerService interface.
 * Key Features:
 *  - Singleton Pattern: Ensures a single instance of the service.
 *  - Custom Message Handling: Allows external handlers for processing Discord messages.
 *  - Robust Error Handling: Implements guard clauses and debug logging for reliability.
 *  - Message Logging: Logs all incoming messages and their history to a file for auditing.
 */
export class DiscordService implements IMessengerService {
  getClientId(): string { return discordConfig.get('DISCORD_CLIENT_ID'); };
  public client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: DiscordMessage, historyMessages: DiscordMessage[]) => void) | null = null;

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

  /**
   * Sets a custom message handler for processing incoming Discord messages.
   * @param handler Function to process messages.
   */
  public setMessageHandler(handler: (message: DiscordMessage, historyMessages: DiscordMessage[]) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initializes the Discord client and logs in using the configured token.
   * @param token Optional bot token, otherwise loads from config.
   */
  public async initialize(token?: string): Promise<void> {
    try {
      token = token || discordConfig.get('DISCORD_BOT_TOKEN') as string;
      await this.client.login(token);
      log('Discord client logged in successfully');
    } catch (error: any) {
      log(`Failed to initialize Discord client: ${error.message}`);
    }
  }

  /**
   * Handles incoming Discord messages and logs them for auditing.
   * @param iMessage The incoming message object.
   * @param historyMessages An array of previous messages for context.
   */
  private async handleMessage(iMessage: DiscordMessage, historyMessages: DiscordMessage[]): Promise<void> {
    try {
      const messageContent = `${iMessage.getAuthorName()}: ${iMessage.getText()}`;
      log(`Handling message from ${iMessage.getAuthorName()}: ${iMessage.getText()}`);

      fs.appendFile(discordLogFile, messageContent + '\n', (error) => {
        if (error) {
          log(`Failed to log IMessage to ${discordLogFile}:`, error.message);
        }

        // Check if message should be processed
        const lastMessageTime = Date.now() - 10000;  // Placeholder for actual message time tracking
        const shouldProcess = shouldProcessMessage(lastMessageTime);

        if (!shouldProcess) {
          log('Message processing skipped due to rate limits or interval settings.');
          return;  // Cancel typing if not processed
        }

        // Add typing indicator with delay
        const channel = this.client.channels.cache.get(iMessage.getChannelId());
        if (channel && channel.isTextBased()) {
          setTimeout(() => {
            channel.sendTyping();
          }, Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000);  // Random delay between 5-10 seconds
        }

        // Call the handler with history messages
        this.messageHandler!(iMessage, historyMessages);
      });
    } catch (error: any) {
      log(`Error in handleMessage: ${error.message}`);
    }
  }

  /**
   * Sends a message to a specified Discord channel.
   * @param channelId The ID of the channel.
   * @param message The message to send.
   */
  public async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    if (!this.client) {
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }

    try {
      log(`Sending message to channel ${channelId}: ${message}`);
      await sendMessageToChannel(channelId, message);
      log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
      log(`Failed to send message to channel ${channelId}: ` + error.message);
      throw error;
    }
  }

  /**
   * Fetches messages from a specified Discord channel.
   * @param channelId The ID of the channel.
   * @param limit Maximum number of messages to retrieve.
   */
  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<DiscordMessage[]> {
    if (!this.client) {
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }

    try {
      log(`Fetching up to ${limit} messages from channel ${channelId}`);
      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${channelId} not found or is not a text-based channel.`);
      }

      const fetchedMessages = await channel.messages.fetch({ limit });
      return fetchedMessages.map((msg) => new DiscordMessage(msg));
    } catch (error: any) {
      log(`Failed to fetch messages from channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sends a public service announcement (PSA) using an embedded message.
   * @param channelId The ID of the channel.
   * @param announcement The PSA details.
   */
  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const channel = this.client.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Discord client is not initialized or the channel is not text-based');
    }

    try {
      log(`Sending public announcement to channel ${channelId}`);
      const embedMessage = new EmbedBuilder().setDescription(announcement.description);
      await channel.send({ embeds: [embedMessage] });
      log(`Public announcement sent to channel ${channelId}`);
    } catch (error: any) {
      log(`Failed to send public announcement to channel ${channelId}: ${error.message}`);
      throw error;
    }
  }
}
