import { Client, Message, EmbedBuilder, GatewayIntentBits } from 'discord.js';
import Debug from 'debug';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
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
    log('Client initialized successfully');

    // Automatically initialize the bot within the constructor
    this.initialize().catch(error => {
      log('Error during bot initialization:', error.message);
    });
  }

  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  // Same initialization logic as before
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
          await debugPermissions(this.client);
        }

        if (this.messageHandler) {
          log('Setting up custom message handler');
          this.client.on('messageCreate', async (message: Message) => {
            if (message.partial) {
              message = await message.fetch();
              log('Fetched full message:', message);
            }
            log(`Received a message with ID: ${message.id}`);
          });
        } else {
          log('No custom message handler set');
        }
      });
    } catch (error: any) {
      log('Failed to start DiscordService: ' + error.message);
      log(error.stack);
      process.exit(1); // Exit the process on failure
    }
  }
}
