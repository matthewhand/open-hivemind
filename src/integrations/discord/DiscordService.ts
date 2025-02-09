/**
 * DiscordService.ts
 *
 * This module manages interactions with the Discord API, including message handling,
 * sending messages, rate limiting, and monitoring events. Implements the IMessengerService interface.
 */

import { 
  Client, 
  Message as DiscordMessageType, 
  GatewayIntentBits, 
  TextChannel, 
  DMChannel 
} from 'discord.js';
import DiscordMessage from './DiscordMessage';
import Debug from 'debug';
import { debugPermissions } from './guild/debugPermissions';
import { sendPublicAnnouncement } from './interaction/sendPublicAnnouncement';
import discordConfig from './interfaces/discordConfig';
import { IMessage } from '@message/interfaces/IMessage';
import messageConfig from '@src/message/interfaces/messageConfig';
import { IMessengerService } from '@src/message/interfaces/IMessengerService';
import { ChatHistory } from '@src/message/common/chatHistory';
import fs from 'fs';
import path from 'path';
import express, { Application } from 'express';

const log = Debug('app:discord-service');
const discordLogFile = path.join(__dirname, '../../logs/discord_message.log'); // Ensure logs directory exists
const filteredChannelId = discordConfig.get('DISCORD_CHANNEL_ID') || '';
const loggingEnabled = discordConfig.get('DISCORD_LOGGING_ENABLED');

// Ensure logging directory exists
if (loggingEnabled && !fs.existsSync(path.dirname(discordLogFile))) {
  fs.mkdirSync(path.dirname(discordLogFile), { recursive: true });
}

log(`Filtered Channel ID: ${filteredChannelId}`);
log(`Logging Enabled: ${loggingEnabled}`);

export class DiscordService implements IMessengerService {
  public client!: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;
  private botUserId: string | null = null;
  private chatHistory: ChatHistory;
  private historyLimit: number;
  private rateLimitPerChannel: number;
  private messageTimestamps: Record<string, number[]> = {};
  private discordBots: { botToken: string; client: Client }[] = [];

  private constructor() {
    log('Initializing DiscordService with multi-bot support');
    this.chatHistory = ChatHistory.getInstance();
    this.historyLimit = messageConfig.get('MESSAGE_HISTORY_LIMIT') || 10;
    this.rateLimitPerChannel = messageConfig.get('MESSAGE_RATE_LIMIT_PER_CHANNEL') || 5;
    // Initialization will set up bots and the default client
    this.initialize();
    log('DiscordService constructor complete');
  }

  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      log('Creating a new instance of DiscordService');
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[]) => void): void {
    this.messageHandler = handler;
    // Register the message handler for all existing bot clients
    for (const bot of this.discordBots) {
      this.setupEventListeners(bot.client);
    }
  }

  public async initialize(app?: Application): Promise<void> {
    try {
      const tokensRaw = discordConfig.get('DISCORD_BOT_TOKEN');
      if (!tokensRaw) {
        throw new Error('DISCORD_BOT_TOKEN is not set');
      }
      let tokens: string[];
      if (typeof tokensRaw === 'string') {
        tokens = [tokensRaw];
      } else if (Array.isArray(tokensRaw)) {
        tokens = tokensRaw;
      } else {
        throw new Error('DISCORD_BOT_TOKEN is not set or is incorrectly formatted');
      }
      log(`Initializing ${tokens.length} bot(s)...`);
      await this.initializeClients(tokens);
    } catch (error: any) {
      log('Failed to start DiscordService:', error.message);
      log(error.stack);
      process.exit(1);
    }
  }

  private async initializeClients(tokens: string[]): Promise<void> {
    this.discordBots = [];
    const botPromises = tokens.map(async (token) => {
      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.MessageContent,
        ],
      });
      try {
        await client.login(token);
        return new Promise<void>((resolve) => {
          client.once('ready', async () => {
            log(`Bot logged in as ${client.user?.tag}! Client ID: ${client.user?.id}`);
            await debugPermissions(client);
            this.setupEventListeners(client);
            this.discordBots.push({ botToken: token, client });
            resolve();
          });
        });
      } catch (error) {
        log(`Failed to log in bot with token: ${token}`);
        throw error;
      }
    });
    await Promise.all(botPromises);
    if (this.discordBots.length > 0) {
      // Set default client to the first bot's client
      this.client = this.discordBots[0].client;
      this.botUserId = this.client.user?.id || null;
    }
    log(`All ${this.discordBots.length} bot(s) are initialized.`);
  }

  private setupEventListeners(client: Client): void {
    if (this.messageHandler) {
      log(`Setting up custom message handler for client ${client.user?.tag}`);
      client.on('messageCreate', async (message: DiscordMessageType) => {
        log(`Incoming Message Channel ID: ${message.channel.id}`);

        // Filter messages from a specific channel if configured
        if (filteredChannelId && message.channel.id !== filteredChannelId) {
          log('Message ignored: Not from the configured channel.');
          return;
        }

        // Ignore messages from bots if configured
        if (message.author.bot && messageConfig.get('MESSAGE_IGNORE_BOTS')) {
          log(`Ignored message from bot: ${message.author.id}`);
          return;
        }

        if (message.partial) {
          try {
            message = await message.fetch();
            log('Fetched full message:', message.id);
          } catch (error: any) {
            log('Error fetching full message:', error.message);
            return;
          }
        }

        // Filter out empty messages
        if (!message.content || message.content.trim().length === 0) {
          log('Empty message, ignoring.');
          return;
        }

        log(`Received a message with ID: ${message.id}`);
        if (loggingEnabled) {
          fs.appendFileSync(discordLogFile, `Message: ${JSON.stringify(message)}\n`);
        }

        // Convert DiscordMessageType to IMessage
        const iMessage: IMessage = new DiscordMessage(message);

        // Add message to chat history
        this.chatHistory.addMessage(iMessage);

        // Retrieve recent message history based on the configurable limit
        const historyMessages: IMessage[] = this.chatHistory.getRecentMessages(this.historyLimit);
        log(`Fetched ${historyMessages.length} messages from channel ${message.channel.id}`);

        if (loggingEnabled) {
          fs.appendFileSync(discordLogFile, `History: ${JSON.stringify(historyMessages)}\n`);
          try {
            fs.appendFileSync(discordLogFile, `Converted to IMessage: ${JSON.stringify(iMessage)}\n`);
          } catch (error: any) {
            log(`Failed to log IMessage: ${error.message}`);
          }
        }

        // Rate Limiting: Check if the channel is rate-limited
        if (this.isRateLimited(message.channel.id)) {
          log(`Channel ${message.channel.id} is rate-limited. Message not processed.`);
          return;
        }

        // Handle the incoming message
        this.messageHandler!(iMessage, historyMessages);

        // Record the message timestamp for rate limiting
        this.recordMessageTimestamp(message.channel.id);
      });
    } else {
      log(`No custom message handler set for client ${client.user?.tag}`);
    }

    client.on('error', (error) => {
      log(`Discord client error: ${error.message}`);
    });
  }

  /**
   * Sends a public announcement to a specified Discord channel.
   */
  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    await sendPublicAnnouncement(channelId, announcement);
  }

  /**
   * Retrieves the bot's client ID.
   */
  public getClientId(): string {
    return this.botUserId || '';
  }

  /**
   * Sends a message to a specified Discord channel.
   */
  public async sendMessageToChannel(channelId: string, message: string, senderName?: string): Promise<void> {
    let clientToUse = this.client;
    if (senderName) {
      const foundBot = this.discordBots.find(bot => bot.client.user && bot.client.user.username === senderName);
      if (foundBot) {
        clientToUse = foundBot.client;
      }
    }
    try {
      log(`Sending message to channel ${channelId}: ${message}`);
      const channel = await clientToUse.channels.fetch(channelId);
      if (!(channel instanceof TextChannel || channel instanceof DMChannel)) {
        throw new Error('Unsupported channel type.');
      }
      if (senderName === undefined) {
        await channel.send(message);
      } else {
        await channel.send(`${senderName}: ${message}`);
      }
      log(`Message sent to channel ${channelId} successfully`);
    } catch (error: any) {
      log(`Failed to send message to channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  public getDefaultChannel(): string {
    let channel = discordConfig.get('DISCORD_DEFAULT_CHANNEL_ID') as string;
    if (!channel) {
      throw new Error('DISCORD_DEFAULT_CHANNEL_ID is not set');
    }
    return channel;
  }

  /**
   * Retrieves recent messages from a specified Discord channel.
   */
  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<IMessage[]> {
    if (!this.client) {
      log('Client not initialized');
      throw new Error('Discord client is not initialized');
    }
    try {
      log(`Fetching ${limit} messages from channel ${channelId}`);
      const channel = await this.client.channels.fetch(channelId);
      if (!(channel instanceof TextChannel || channel instanceof DMChannel)) {
        throw new Error('Unsupported channel type.');
      }
      const messages = await channel.messages.fetch({ limit });
      return messages.map((msg) => new DiscordMessage(msg));
    } catch (error: any) {
      log(`Failed to fetch messages from channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Records the timestamp of a sent message for rate limiting.
   */
  private recordMessageTimestamp(channelId: string): void {
    const currentTime = Date.now();
    if (!this.messageTimestamps[channelId]) {
      this.messageTimestamps[channelId] = [];
    }
    this.messageTimestamps[channelId].push(currentTime);
    // Remove timestamps older than 60 seconds
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId].filter(
      (timestamp) => currentTime - timestamp <= 60000
    );
    log(`Recorded message timestamp for channel ${channelId}. Total in last minute: ${this.messageTimestamps[channelId].length}`);
  }

  /**
   * Checks if the channel is rate-limited based on recent message timestamps.
   */
  private isRateLimited(channelId: string): boolean {
    const currentTime = Date.now();
    if (!this.messageTimestamps[channelId]) {
      this.messageTimestamps[channelId] = [];
      return false;
    }
    // Remove timestamps older than 60 seconds
    this.messageTimestamps[channelId] = this.messageTimestamps[channelId].filter(
      (timestamp) => currentTime - timestamp <= 60000
    );
    const isLimited = this.messageTimestamps[channelId].length >= this.rateLimitPerChannel;
    if (isLimited) {
      log(`Channel ${channelId} has reached the rate limit of ${this.rateLimitPerChannel} messages per minute.`);
    }
    return isLimited;
  }

  /**
   * Gracefully shuts down the Discord clients.
   */
  public async shutdown(): Promise<void> {
    if (this.discordBots && this.discordBots.length > 0) {
      for (const bot of this.discordBots) {
        await bot.client.destroy();
        log(`Bot with token ${bot.botToken} has been shut down.`);
      }
    } else if (this.client) {
      await this.client.destroy();
      log('Discord client has been shut down.');
    }
  }
}
