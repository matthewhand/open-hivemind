import { Client, GatewayIntentBits, Message, TextChannel, PermissionsBitField } from 'discord.js';
import { initializeClient } from './interaction/initializeClient';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage'; // Import your DiscordMessage implementation
import ConfigurationManager from '@common/config/ConfigurationManager';  // Properly import ConfigurationManager

const log = Debug('app:discord-service');

/**
 * DiscordService Class
 *
 * Manages Discord interactions, including message handling, voice channel connections,
 * and AI response processing. This service is implemented as a singleton to ensure
 * consistent and centralized management of the Discord client.
 *
 * Key Features:
 * - Singleton pattern for centralized client management
 * - Handles message interactions and responses
 * - Supports sending messages to channels and managing voice states
 */
export class DiscordService {
  private client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage) => void) | null = null;
  private configManager: ConfigurationManager;

  /**
   * Private constructor to enforce singleton pattern.
   * Initializes the Discord client with the necessary intents and ConfigurationManager.
   */
  private constructor() {
    log('Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
    this.client = initializeClient();
    this.configManager = ConfigurationManager.getInstance();  // Instantiate ConfigurationManager
    log('Client initialized successfully');
  }

  /**
   * Returns the singleton instance of DiscordService, creating it if necessary.
   * @returns The singleton instance of DiscordService.
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  /**
   * Sets a custom message handler for processing incoming messages.
   * @param handler - The function to handle incoming messages.
   */
  public setMessageHandler(handler: (message: IMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initializes the Discord service by logging in and setting up event handlers.
   */
  public async initialize(token?: string): Promise<void> {
    try {
      // Use ConfigurationManager to retrieve the Discord token if not provided directly
      token = token || this.configManager.DISCORD_TOKEN;
      if (!token) {
        throw new Error('DISCORD_TOKEN is not set');
      }
      await this.client.login(token);
      this.client.once('ready', async () => {
        log(`Logged in as ${this.client.user?.tag}!`);
        await this.debugPermissions();  // Added permission debugging after bot is ready
      });

      // Set up the message event handler if provided
      if (this.messageHandler) {
        log('Setting up custom message handler');
        this.client.on('messageCreate', (message: Message<boolean>) => {
          log(`Received a message with ID: ${message.id}`);

          // Convert the Discord.js message to your IMessage implementation
          const iMessage: IMessage = new DiscordMessage(message);

          // Call the handler with the converted IMessage
          this.messageHandler!(iMessage);
        });
      } else {
        log('No custom message handler set');
      }
    } catch (error: any) {
      log('Failed to start DiscordService: ' + error.message);
      process.exit(1);
    }
  }

  /**
   * Starts the Discord service, initializing the client.
   */
  public async start(token: string): Promise<void> {
    await this.initialize(token);
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
      log(`Sending message to channel ${channelId}: ${message}`);
      await channel.send(message);
      log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
      log(`Failed to send message to channel ${channelId}: ` + error.message);
      throw error;
    }
  }

  /**
   * Debugs the bot's permissions in each guild it is a part of.
   * Logs warnings for any missing permissions.
   */
  private async debugPermissions(): Promise<void> {
    this.client.guilds.cache.forEach(guild => {
      const botMember = guild.members.cache.get(this.client.user?.id!);
      if (!botMember) {
        log(`Bot not found in guild: ${guild.name}`);
        return;
      }

      const permissions = botMember.permissions;

      // List of permissions the bot should have (adjust as needed)
      const requiredPermissions = [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.ReadMessageHistory,
      ];

      // Check for each required permission
      requiredPermissions.forEach(permission => {
        if (!permissions.has(permission)) {
          log(`Bot lacks permission ${permission.toString()} in guild: ${guild.name}`);
        }
      });

      // Log a summary of permissions for each guild
      log(`Permissions in guild "${guild.name}":`, permissions.toArray().map(perm => perm.toString()));
    });
  }
}
