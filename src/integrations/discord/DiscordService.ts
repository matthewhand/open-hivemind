import { Client, Message, EmbedBuilder } from 'discord.js';
import { initializeClient } from './interaction/initializeClient';
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

export class DiscordService implements IMessengerService {
  private client: Client;
  private static instance: DiscordService;
  private messageHandler: ((message: IMessage, historyMessages: IMessage[]) => void) | null = null;

  private constructor() {
    log('Initializing Client with intents: Guilds, GuildMessages, GuildVoiceStates');
    this.client = initializeClient();
    log('Client initialized successfully');
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
  }

  public async initialize(token?: string): Promise<void> {
    try {
      token = token || discordConfig.get('DISCORD_BOT_TOKEN') as string;
      if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');
      log(`Initializing bot with token: ${token ? 'token set' : 'no token found'}`);
      await this.client.login(token);
      this.client.once('ready', async () => {
        const botClientId = this.client.user?.id;
        if (botClientId) log(`Logged in as ${this.client.user?.tag}! Client ID: ${botClientId}`);
        await debugPermissions(this.client);
      });
      if (this.messageHandler) {
        log('Setting up custom message handler');
        this.client.on('messageCreate', async (message: Message) => {
          log(`Received a message with ID: ${message.id}`);
          try { fs.appendFileSync(discordLogFile, `Full message object: ${JSON.stringify(message)}\n`); } catch (error: any) { log(`Failed to log message details:`, error.message); }
          const channelId = message.channelId;
log(`Extracted channelId: ${channelId}`);
          const historyMessages = await this.getMessagesFromChannel(channelId, 10);
          try { fs.appendFileSync(discordLogFile, `Fetched message history: ${JSON.stringify(historyMessages)}\n`); } catch (error: any) { log(`Failed to log history:`, error.message); }
          const iMessage: IMessage = new DiscordMessage(message);
          try { fs.appendFileSync(discordLogFile, `Converted to IMessage: ${JSON.stringify(iMessage)}\n`); } catch (error: any) { log(`Failed to log IMessage:`, error.message); }
          this.messageHandler!(iMessage, historyMessages);
        });
      } else {
        log('No custom message handler set');
      }
    } catch (error: any) {
      log('Failed to start DiscordService: ' + error.message);
      process.exit(1);
    }
  }

  public async sendMessageToChannel(channelId: string, message: string): Promise<void> {
    if (!this.client) throw new Error('Discord client is not initialized');
    try {
      log(`Sending message to channel ${channelId}: ${message}`);
      await sendMessageToChannel(this.client, channelId, message);
      log(`Message sent successfully`);
    } catch (error: any) {
      log(`Failed to send message: ` + error.message);
      throw error;
    }
  }

  public async getMessagesFromChannel(channelId: string, limit: number = 10): Promise<IMessage[]> {
    if (!this.client) throw new Error('Discord client is not initialized');
    try {
      log(`Fetching up to ${limit} messages from channel ${channelId}`);
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) throw new Error(`Channel not found or is not text-based.`);
      const fetchedMessages = await channel.messages.fetch({ limit });
      return fetchedMessages.map((msg) => new DiscordMessage(msg));
    } catch (error: any) {
      log(`Failed to fetch messages from channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    if (!this.client) throw new Error('Discord client is not initialized');
    const embed = new EmbedBuilder()
      .setTitle(announcement.title || '📢 Public Announcement')
      .setDescription(announcement.description || 'No description provided')
      .setColor(announcement.color || '#0099ff')
      .setTimestamp();
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel?.isTextBased()) throw new Error('Channel is not text-based or does not exist');
      await channel.send({ embeds: [embed] });
      log(`Public announcement sent successfully`);
    } catch (error: any) {
      log(`Failed to send announcement: ${error.message}`);
      throw error;
    }
  }
}
