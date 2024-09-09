import { Client, Message } from 'discord.js';
import { initializeClient } from './interaction/initializeClient';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import { sendMessageToChannel } from '@src/integrations/discord/channel/sendMessageToChannel';  // Reusing utility
import debugPermissions from '@src/integrations/discord/guild/debugPermissions';  // Reusing utility
import discordConfig from '@integrations/discord/interfaces/discordConfig';  // Using convict for config

const log = Debug('app:discord-service');

/**
 * DiscordService Class
 * 
 * This service handles interactions with the Discord API, managing message handling,
 * user authentication, and other Discord-related operations.
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
   */
  public setMessageHandler(handler: (message: IMessage) => void): void {
    this.messageHandler = handler;
  }

  /**
   * Initializes the Discord client and logs in with the provided token.
   */
  public async initialize(token?: string): Promise<void> {
    try {
      // Retrieve the token using discordConfig (Convict)
      token = token || discordConfig.get('DISCORD_BOT_TOKEN') as string;

      if (!token) {
        throw new Error('DISCORD_BOT_TOKEN is not set');
      }

      await this.client.login(token);
      this.client.once('ready', async () => {
        const botClientId = this.client.user?.id;
        if (botClientId) {
          // Optionally store bot client ID in the config or elsewhere as needed
          log(`Logged in as ${this.client.user?.tag}! Client ID: ${botClientId}`);
        }

        await debugPermissions(this.client);  // Use existing debugPermissions utility
      });

      if (this.messageHandler) {
        log('Setting up custom message handler');
        this.client.on('messageCreate', (message: Message) => {
          log(`Received a message with ID: ${message.id}`);
          const iMessage: IMessage = new DiscordMessage(message);
          this.messageHandler!(iMessage);
        });
      } else {
        log('No custom message handler set');
      }
    } catch (error: any) {
      log('Failed to start DiscordService: ' + error.message);
      log(error.stack); 
      process.exit(1);
    }
  }

  /**
   * Sends a message to a specified Discord channel using the utility.
   */
  public async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    try {
      log(`Sending message to channel ${channelId}: ${message}`);
      await sendMessageToChannel(this.client, channelId, message);  // Use utility
      log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
      log(`Failed to send message to channel ${channelId}: ` + error.message);
      log(error.stack);
      throw error;
    }
  }
}
