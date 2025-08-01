import { Client, GatewayIntentBits, Message, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import Debug from 'debug';
import discordConfig from '@config/discordConfig';
import DiscordMessage from './DiscordMessage';
import { IMessage } from '@message/interfaces/IMessage';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import * as fs from 'fs';
import * as path from 'path';

const log = Debug('app:discordService');

interface Bot {
  client: Client;
  botUserId: string;
  botUserName: string;
  config: any;
}

export const Discord = {
  /**
   * DiscordService - High-level Discord integration service implementing IMessengerService
   *
   * ARCHITECTURE OVERVIEW:
   * - Multi-bot support: Can manage multiple Discord bot instances
   * - Legacy compatibility: Supports both new configuration system and legacy formats
   * - Platform abstraction: Provides Discord-specific implementation of IMessengerService
   * - Error handling: Comprehensive validation and error reporting
   *
   * CONFIGURATION SOURCES (in order of priority):
   * 1. New BotConfigurationManager (recommended)
   * 2. Environment variables (DISCORD_BOT_TOKEN)
   * 3. Legacy config files (messengers.json)
   *
   * USAGE PATTERNS:
   * - Single bot: DISCORD_BOT_TOKEN="your-token"
   * - Multi-bot: DISCORD_BOT_TOKEN="token1,token2,token3"
   * - Config file: Use BotConfigurationManager for complex setups
   *
   * @example
   * ```typescript
   * // Basic initialization
   * const service = Discord.DiscordService.getInstance();
   * await service.initialize();
   *
   * // Multi-bot setup
   * const bots = service.getAllBots();
   * console.log(`Running ${bots.length} Discord bots`);
   *
   * // Send message as specific bot
   * await service.sendMessageToChannel("123456789", "Hello", "Bot #2");
   * ```
   */
  DiscordService: class implements IMessengerService {
    private static instance: DiscordService;
    private bots: Bot[] = [];
    private handlerSet: boolean = false;

    private static readonly intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ];

    /**
     * Constructor handles multi-bot initialization from various configuration sources.
     *
     * CONFIGURATION PRIORITY:
     * 1. Test mode: Uses legacy configuration for test compatibility
     * 2. New system: Uses BotConfigurationManager for multi-bot setups
     * 3. Legacy fallback: Environment variables or config files
     *
     * ERROR HANDLING:
     * - Validates all tokens before initialization
     * - Provides clear error messages for configuration issues
     * - Supports graceful degradation with fallback options
     */
    public constructor() {
      this.bots = [];
      
      // Skip new configuration system in test mode to maintain legacy test compatibility
      if (process.env.NODE_ENV === 'test') {
        this.loadLegacyConfigurationWithValidation();
        return;
      }
      
      // Use the new BotConfigurationManager for multi-bot configuration
      const configManager = BotConfigurationManager.getInstance();
      const botConfigs = configManager.getDiscordBotConfigs();
      
      if (botConfigs.length > 0) {
        // Use new configuration system
        botConfigs.forEach((botConfig) => {
          const client = new Client({ intents: Discord.DiscordService.intents });
          this.bots.push({
            client,
            botUserId: '',
            botUserName: botConfig.name,
            config: botConfig
          });
        });
      } else {
        // Fall back to legacy configuration with validation
        this.loadLegacyConfigurationWithValidation();
      }
    }

    private loadLegacyConfigurationWithValidation(): void {
      // Legacy comma-separated tokens from environment variable
      const legacyTokens = process.env.DISCORD_BOT_TOKEN;
      if (legacyTokens) {
        const tokens = legacyTokens.split(',').map(token => token.trim());
        
        tokens.forEach((token, index) => {
          if (!token) {
            throw new Error(`Empty token at position ${index + 1}`);
          }
          
          const client = new Client({ intents: Discord.DiscordService.intents });
          this.bots.push({
            client,
            botUserId: '',
            botUserName: `Bot${index + 1}`,
            config: {
              name: `Bot${index + 1}`,
              token: token,
              discord: { token },
              llmProvider: 'flowise' // Default for legacy
            }
          });
        });
        return;
      }

      // Legacy configuration from config file
      // Check both possible config paths (test and production)
      const configPaths = [
        path.join(__dirname, '../../../config/messengers.json'),
        path.join(__dirname, '../../../config/test/messengers.json')
      ];
      
      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (config.discord && config.discord.instances) {
            config.discord.instances.forEach((instance: any, index: number) => {
              if (!instance.token) {
                throw new Error(`Empty token at position ${index + 1} in config file`);
              }
              
              const client = new Client({ intents: Discord.DiscordService.intents });
              this.bots.push({
                client,
                botUserId: '',
                botUserName: instance.name || `Bot${index + 1}`,
                config: {
                  name: instance.name || `Bot${index + 1}`,
                  token: instance.token,
                  discord: { token: instance.token },
                  llmProvider: 'flowise' // Default for legacy
                }
              });
            });
            return;
          }
        }
      }

      throw new Error('No Discord bot tokens provided in configuration');
    }

    public static getInstance(): DiscordService {
      if (!Discord.DiscordService.instance) {
        try {
          Discord.DiscordService.instance = new Discord.DiscordService();
        } catch (error: any) {
          throw new Error(`Failed to create DiscordService instance: ${error.message}`);
        }
      }
      return Discord.DiscordService.instance;
    }

    public getAllBots(): Bot[] {
      return this.bots;
    }

    public getClient(index = 0): Client {
      return this.bots[index]?.client || this.bots[0].client;
    }

    public async initialize(): Promise<void> {
      // Validate tokens before initializing
      const hasEmptyToken = this.bots.some(bot => {
        const token = bot.config.token || bot.config.discord?.token;
        return !token || token.trim() === '';
      });
      
      if (hasEmptyToken) {
        throw new Error('Cannot initialize DiscordService: One or more bot tokens are empty');
      }
  
      const loginPromises = this.bots.map((bot) => {
        return new Promise<void>(async (resolve) => {
          bot.client.once('ready', () => {
            console.log(`Discord ${bot.botUserName} logged in as ${bot.client.user?.tag}`);
            bot.botUserId = bot.client.user?.id || '';
            log(`Initialized ${bot.botUserName} OK`);
            resolve();
          });
  
          const token = bot.config.token || bot.config.discord?.token;
          await bot.client.login(token);
          log(`Bot ${bot.botUserName} logged in`);
        });
      });
  
      await Promise.all(loginPromises);
    }

    public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void {
      if (this.handlerSet) return;
      this.handlerSet = true;

      this.bots.forEach((bot) => {
        bot.client.on('messageCreate', async (message) => {
          if (message.author.bot) return;

          const wrappedMessage = new DiscordMessage(message);
          const history = await this.getMessagesFromChannel(message.channelId);
          await handler(wrappedMessage, history, bot.config);
        });
      });
    }

    /**
     * Sends a message to a Discord channel using the specified bot instance
     * @param channelId The target channel ID
     * @param text The message text to send
     * @param senderName Optional bot instance name (e.g. "Madgwick AI #2")
     * @param threadId Optional thread ID if sending to a thread
     * @returns The message ID or empty string on failure
     * @throws Error if no bots are available
     */
    public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
      if (this.bots.length === 0) {
        throw new Error('No Discord bot instances available');
      }

      const botInfo = this.bots.find((b) => b.botUserName === senderName) || this.bots[0];
      try {
        console.log(`Sending to channel ${channelId} as ${senderName}`);
        const channel = await botInfo.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          throw new Error(`Channel ${channelId} is not text-based or was not found`);
        }

        let message;
        if (threadId) {
          const thread = await botInfo.client.channels.fetch(threadId);
          if (!thread || !thread.isThread()) {
            throw new Error(`Thread ${threadId} is not a valid thread or was not found`);
          }
          message = await thread.send(text);
        } else {
          console.log(`Attempting send to channel ${channelId}: *${senderName}*: ${text}`);
          message = await (channel as TextChannel | NewsChannel | ThreadChannel).send(text);
        }

        console.log(`Sent message ${message.id} to channel ${channelId}${threadId ? `/${threadId}` : ''}`);
        return message.id;
      } catch (error: any) {
        console.log(`Error sending to ${channelId}${threadId ? `/${threadId}` : ''}: ${error.message}`);
        return '';
      }
    }

    public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
      const rawMessages = await this.fetchMessages(channelId);
      return rawMessages.map(msg => new DiscordMessage(msg));
    }

    public async fetchMessages(channelId: string): Promise<Message[]> {
      const botInfo = this.bots[0];
      try {
        const channel = await botInfo.client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
          throw new Error('Channel is not text-based or was not found');
        }
        const limit = (discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number | undefined) || 10;
        const messages = await channel.messages.fetch({ limit });
        return Array.from(messages.values());
      } catch (error: any) {
        console.log(`Failed to fetch messages from ${channelId}: ${error.message}`);
        return [];
      }
    }

    public async sendPublicAnnouncement(channelId: string, announcement: string, threadId?: string): Promise<void> {
      const botInfo = this.bots[0];
      const text = `**Announcement**: ${announcement}`;
      await this.sendMessageToChannel(channelId, text, botInfo.botUserName, threadId);
    }

    public getClientId(): string {
      return this.bots[0].botUserId || '';
    }

    public getDefaultChannel(): string {
      return (discordConfig.get('DISCORD_DEFAULT_CHANNEL_ID') as string | undefined) || '';
    }

    public async shutdown(): Promise<void> {
      for (const bot of this.bots) {
        await bot.client.destroy();
        log(`Bot ${bot.botUserName} shut down`);
      }
      Discord.DiscordService.instance = undefined as any;
    }

    public getBotByName(name: string): Bot | undefined {
      return this.bots.find((bot) => bot.botUserName === name);
    }
  }
};

type DiscordService = InstanceType<typeof Discord.DiscordService>;
