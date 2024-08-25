import { Client, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import { initializeClient } from './interaction/initializeClient';
import { handleMessage } from './interaction/handleMessage';
import { IMessage } from '../interfaces/IMessage';
import { IMessengerService } from '../interfaces/IMessengerService';
/**
 * Service implementation for managing Discord interactions, including message handling,
 * voice channel connections, and AI response processing.
 */
export class DiscordService implements IMessengerService {
  private client: Client;
  private static instance: DiscordService;
  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the Discord client with the necessary intents.
   */
  private constructor() {
    debug('DiscordService: Initializing Client with intents: Guilds  GuildMessages, GuildVoiceStates');
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    });
    debug('DiscordService: Client initialized successfully');
  }
  /**
   * Returns the singleton instance of DiscordService, creating it if necessary.
   * @returns The singleton instance of DiscordService.
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      debug('DiscordService: Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }
  /**
   * Initializes the Discord service by logging in and setting up event handlers.
   */
  public async initialize(token?: string): Promise<void> {
    try {
      token = token || process.env.DISCORD_TOKEN;
      if (!token) {
        throw new Error('DISCORD_TOKEN is not set');
      }
      await this.client.login(token);
      this.client.once('ready', () => {
        debug(`Logged in as ${this.client.user?.tag}!`);
      });
      initializeClient(this.client);
    } catch (error: any) {
      debug('Failed to start DiscordService:'  error);
      process.exit(1);
    }
  }
  /**
   * Starts the Discord service, initializing the client.
   * @param token - The Discord bot token.
   */
  public async start(token: string): Promise<void> {
    await this.initialize(token);
  }
  /**
   * Handles incoming messages, determining if an AI response is needed,
   * preparing the request, and sending the response.
   * @param message - The incoming message.
   */
  public async handleMessage(message: Message<boolean>): Promise<void> {
    debug.debug('DiscordService: Handling message with ID ' + message.id);
    await handleMessage(message);
  }
  /**
   * Sends a message to a specified channel.
   * @param {string} channelId - The ID of the channel to send the message to.
   * @param {string} message - The message content to send.
   * @returns {Promise<void>} A promise that resolves when the message is sent.
   */
  public async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    try {
      const channel = this.client.channels.cache.get(channelId) as TextChannel;
      if (!channel) {
        throw new Error('Channel not found');
      }
      await channel.send(message);
      debug(`Message sent to channel ${channelId}: ${message}`);
    } catch (error: any) {
      debug(`Failed to send message to channel ${channelId}:`  error);
      throw error;
    }
  }
}
