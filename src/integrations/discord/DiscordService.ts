import { Client, Message, EmbedBuilder } from "discord.js";
import { PartialGroupDMChannel } from "discord.js";
import { TextChannel, DMChannel } from "discord.js";
import { GatewayIntentBits } from 'discord.js';
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

/**
 * DiscordService Class
 * This service manages the interaction with the Discord API, including message handling,
 * user authentication, and other Discord operations. It implements the IMessengerService interface.
 * Key Features:
 *  - Singleton Pattern: Ensures a single instance of the service.
 *  - Custom Message Handling: Allows external handlers for processing Discord messages.
 *  - Robust Error Handling: Implements guard clauses and debug logging for reliability.
 *  - Message Logging: Logs all incoming messages and their history to a file for auditing.
 */
export class DiscordService implements IMessengerService {
  getClientId(): string {
    return discordConfig.get('DISCORD_CLIENT_ID');
  }
  public client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;

  // Private constructor to enforce singleton pattern
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

  /**
   * Retrieves the singleton instance of DiscordService.
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
   * @param handler Function to process messages.
   */
  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initializes the Discord client and logs in using the configured token.
   * @param token Optional bot token, otherwise loads from config.
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
        const botClientId = this.client.user?.id;
        if (botClientId) {
          log(`Logged in as ${this.client.user?.tag}! Client ID: ${botClientId}`);
        }

        await debugPermissions(this.client); // Debug the bot's permissions in the guild
      });

      if (this.messageHandler) {
        log('Setting up custom message handler');
        this.client.on('messageCreate', async (message: Message) => {
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
            fs.appendFileSync(discordLogFile, `Full message object: ${JSON.stringify(message)}\n`);
          } catch (error: any) {
            log(`Failed to log message details to ${discordLogFile}:`, error.message);
          }

          const channelId = message.channelId;
          log(`Extracted channelId: ${channelId}`);

          const historyMessages = await this.getMessagesFromChannel(channelId, 10);
          try {
            fs.appendFileSync(discordLogFile, `Fetched message history: ${JSON.stringify(historyMessages)}\n`);
          } catch (error: any) {
            log(`Failed to log message history to ${discordLogFile}:`, error.message);
          }

          const iMessage: IMessage = new DiscordMessage(message);
          try {
            fs.appendFileSync(discordLogFile, `Converted to IMessage: ${JSON.stringify(iMessage)}\n`);
          } catch (error: any) {
            log(`Failed to log IMessage to ${discordLogFile}:`, error.message);
          }

          this.messageHandler!(iMessage, historyMessages);
        });
      } else {
        log('No custom message handler set');
      }
    } catch (error: any) {
      log('Failed to start DiscordService: ' + error.message);
      log(error.stack);
      process.exit(1); // Exit the process on failure
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
      const channel = await this.client.channels.fetch(channelId);
if (!(channel instanceof TextChannel || channel instanceof DMChannel)) { throw new Error(`Unsupported channel type for send method.`); }
if (!channel) { throw new Error(`Channel ${channelId} not found`); }
if (channel instanceof PartialGroupDMChannel) { throw new Error("Cannot send messages to PartialGroupDMChannel"); }
if (channel instanceof TextChannel || channel instanceof DMChannel) {
if (channel instanceof PartialGroupDMChannel) { throw new Error("Cannot send messages to PartialGroupDMChannel"); }
        await channel.send(message);
      } else {
        throw new Error('Channel is not text-based or does not support sending messages');
      }
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
  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<IMessage[]> {
    if (!this.client) {
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }

    try {
      log(`Fetching up to ${limit} messages from channel ${channelId}`);
      const channel = await this.client.channels.fetch(channelId);
if (!(channel instanceof TextChannel || channel instanceof DMChannel)) { throw new Error(`Unsupported channel type for send method.`); }
if (!channel) { throw new Error(`Channel ${channelId} not found`); }

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
if (!(channel instanceof TextChannel || channel instanceof DMChannel)) { throw new Error(`Unsupported channel type for send method.`); }
if (!channel) { throw new Error(`Channel ${channelId} not found`); }
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
