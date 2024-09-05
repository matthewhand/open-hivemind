import { Client, GatewayIntentBits, Message, TextChannel, PermissionsBitField } from 'discord.js';
import { initializeClient } from './interaction/initializeClient';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import discordConfig from '@integrations/discord/interfaces/discordConfig';

const log = Debug('app:discord-service');

/**
 * DiscordService Class
 * 
 * This service handles interactions with the Discord API, managing message handling,
 * user authentication, and other Discord-related operations. It follows the singleton
 * pattern to ensure that only one instance of the service is used throughout the application.
 * 
 * Key Features:
 * - Singleton pattern for centralized management
 * - Handles user authentication and message interactions
 * - Manages Discord client initialization and event handling
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
   * 
   * @returns {DiscordService} The singleton instance of DiscordService.
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  /**
   * Sets a custom message handler for incoming messages.
   * 
   * @param handler - The message handler to set.
   */
  public setMessageHandler(handler: (message: IMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initializes the Discord client and logs in with the provided token.
   * 
   * @param token - The token to use for logging in. If not provided, the token will be retrieved from the configuration.
   */
  public async initialize(token?: string): Promise<void> {
    try {
      // Retrieve the token from the configuration if not provided
      token = token || discordConfig.get<string>('DISCORD_BOT_TOKEN');

      if (!token) {
        throw new Error('DISCORD_BOT_TOKEN is not set');
      }

      await this.client.login(token);
      this.client.once('ready', async () => {
        log(`Logged in as ${this.client.user?.tag}!`);
        await this.debugPermissions();
      });

      if (this.messageHandler) {
        log('Setting up custom message handler');
        this.client.on('messageCreate', (message: Message<boolean>) => {
          log(`Received a message with ID: ${message.id}`);

          const iMessage: IMessage = new DiscordMessage(message);

          this.messageHandler!(iMessage);
        });
      } else {
        log('No custom message handler set');
      }
    } catch (error: any) {
      log('Failed to start DiscordService: ' + error.message);
      log(error.stack); // Improvement: Added stack trace logging for better error tracking
      process.exit(1);
    }
  }

  /**
   * Starts the Discord service by initializing and logging in the client.
   * 
   * @param token - The token to use for logging in.
   */
  public async start(token: string): Promise<void> {
    await this.initialize(token);
  }

  /**
   * Sends a message to a specified Discord channel.
   * 
   * @param channelId - The ID of the channel to send the message to.
   * @param message - The message content to send.
   */
  public async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    try {
      const channel = this.client.channels.cache.get(channelId) as TextChannel;
      if (!channel) {
        throw new Error('Channel not found');
      }
      log(`Sending message to channel ${channelId}: ${message}`);
      await channel.send(message);
      log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
      log(`Failed to send message to channel ${channelId}: ` + error.message);
      log(error.stack); // Improvement: Added stack trace logging for better error debugging
      throw error;
    }
  }

  /**
   * Debugs and logs the bot's permissions in each guild it is part of.
   */
  private async debugPermissions(): Promise<void> {
    this.client.guilds.cache.forEach(guild => {
      const botMember = guild.members.cache.get(this.client.user?.id!);
      if (!botMember) {
        log(`Bot not found in guild: ${guild.name}`);
        return;
      }

      const permissions = botMember.permissions;
      const requiredPermissions = [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
      ];

      requiredPermissions.forEach(permission => {
        if (!permissions.has(permission)) {
          log(`Bot lacks permission ${permission.toString()} in guild: ${guild.name}`);
        }
      });

      log(`Permissions in guild "${guild.name}":`, permissions.toArray().map(perm => perm.toString()));
    });
  }
}
