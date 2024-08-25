import { Client, GatewayIntentBits, Message } from 'discord.js';
import logger from '@src/utils/logger';
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
    logger.info('DiscordService: Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates],
    });
    logger.info('DiscordService: Client initialized successfully');
  }

  /**
   * Returns the singleton instance of DiscordService, creating it if necessary.
   * @returns The singleton instance of DiscordService.
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      logger.info('DiscordService: Creating a new instance of DiscordService');
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
        logger.info(`Logged in as ${this.client.user?.tag}!`);
      });
      initializeClient(this.client);
    } catch (error: any) {
      logger.error('Failed to start DiscordService:', error);
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
  public async handleMessage(message: IMessage): Promise<void> {
    logger.debug('DiscordService: Handling message with ID ' + message.getMessageId());
    await handleMessage(message);
  }
}
