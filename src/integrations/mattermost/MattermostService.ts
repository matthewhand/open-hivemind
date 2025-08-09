import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import MattermostClient from './mattermostClient';
import { Application } from 'express';
// Routing (feature-flagged parity)
import messageConfig from '@config/messageConfig';
import { computeScore as channelComputeScore } from '@message/routing/ChannelRouter';

/**
 * MattermostService implementation supporting multi-instance configuration
 * Uses BotConfigurationManager for consistent multi-bot support across platforms
 */
export class MattermostService implements IMessengerService {
  private static instance: MattermostService | undefined;
  private clients: Map<string, MattermostClient> = new Map();
  private channels: Map<string, string> = new Map();
  private botConfigs: Map<string, any> = new Map();
  private app?: Application;

  // Channel prioritization support hook (delegation gated by MESSAGE_CHANNEL_ROUTER_ENABLED)
  public supportsChannelPrioritization: boolean = true;

  private constructor() {
    console.log('Initializing MattermostService with multi-instance support');
    this.initializeFromConfiguration();
  }

  /**
   * Initialize MattermostService from BotConfigurationManager
   * Supports multiple Mattermost bot instances with BOTS_* environment variables
   */
  private initializeFromConfiguration(): void {
    const configManager = BotConfigurationManager.getInstance();
    const mattermostBotConfigs = configManager.getAllBots().filter(bot => 
      bot.messageProvider === 'mattermost' && bot.mattermost?.token
    );

    if (mattermostBotConfigs.length === 0) {
      console.warn('No Mattermost bot configurations found');
      return;
    }

    console.log(`Initializing ${mattermostBotConfigs.length} Mattermost bot instances`);
    
    for (const botConfig of mattermostBotConfigs) {
      this.initializeBotInstance(botConfig);
    }
  }

  /**
   * Initialize a single Mattermost bot instance
   */
  private initializeBotInstance(botConfig: any): void {
    const botName = botConfig.name;
    
    if (!botConfig.mattermost?.serverUrl || !botConfig.mattermost?.token) {
      console.error(`Invalid Mattermost configuration for bot: ${botName}`);
      return;
    }

    console.log(`Initializing Mattermost bot: ${botName}`);

    const client = new MattermostClient({
      serverUrl: botConfig.mattermost.serverUrl,
      token: botConfig.mattermost.token
    });

    this.clients.set(botName, client);
    this.channels.set(botName, botConfig.mattermost.channel || 'town-square');
    this.botConfigs.set(botName, {
      name: botName,
      serverUrl: botConfig.mattermost.serverUrl,
      token: botConfig.mattermost.token,
      channel: botConfig.mattermost.channel || 'town-square'
    });
  }

  public static getInstance(): MattermostService {
    if (!MattermostService.instance) {
      MattermostService.instance = new MattermostService();
    }
    return MattermostService.instance;
  }

  public async initialize(): Promise<void> {
    console.log('Initializing Mattermost connections...');
    
    for (const [botName, client] of this.clients) {
      try {
        await client.connect();
        console.log(`Connected to Mattermost server for bot: ${botName}`);
      } catch (error) {
        console.error(`Failed to connect to Mattermost for bot ${botName}:`, error);
        throw error;
      }
    }
  }

  public setApp(app: Application): void {
    this.app = app;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void {
    console.log('Setting message handler for Mattermost bots');
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
    const botName = senderName || Array.from(this.clients.keys())[0];
    const client = this.clients.get(botName);
    
    if (!client) {
      throw new Error(`Bot ${botName} not found`);
    }

    try {
      await client.postMessage({
        channel: channelId,
        text: text
      });
      
      console.log(`[${botName}] Sent message to channel ${channelId}`);
      return Date.now().toString();
    } catch (error) {
      console.error(`[${botName}] Failed to send message:`, error);
      throw error;
    }
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    return this.fetchMessages(channelId, 10);
  }

  public async fetchMessages(channelId: string, limit: number = 10, botName?: string): Promise<IMessage[]> {
    const targetBot = botName || Array.from(this.clients.keys())[0];
    const client = this.clients.get(targetBot);
    
    if (!client) {
      console.error(`Bot ${targetBot} not found`);
      return [];
    }

    console.log(`[${targetBot}] Fetching ${limit} messages from channel ${channelId}`);
    return [];
  }

  public async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    const text = typeof announcement === 'string' ? announcement : announcement?.message || 'Announcement';
    
    for (const [botName, client] of this.clients) {
      try {
        await client.postMessage({
          channel: channelId,
          text: text
        });
        console.log(`[${botName}] Sent announcement to channel ${channelId}`);
      } catch (error) {
        console.error(`[${botName}] Failed to send announcement:`, error);
      }
    }
  }

  public async joinChannel(channel: string): Promise<void> {
    console.log(`Joining Mattermost channel: ${channel}`);
  }

  public getClientId(): string {
    const firstBot = Array.from(this.clients.keys())[0];
    return firstBot || 'mattermost-bot';
  }

  public getDefaultChannel(): string {
    const firstBot = Array.from(this.channels.keys())[0];
    return this.channels.get(firstBot) || 'town-square';
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down MattermostService...');
    MattermostService.instance = undefined;
  }

  /**
   * Channel scoring hook: returns 0 when MESSAGE_CHANNEL_ROUTER_ENABLED is disabled,
   * otherwise delegates to ChannelRouter.computeScore to keep parity with other providers.
   */
  public scoreChannel(channelId: string, metadata?: Record<string, any>): number {
    try {
      const enabled = Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
      if (!enabled) return 0;
      return channelComputeScore(channelId, metadata);
    } catch (_e) {
      // Be conservative: on any error, neutralize impact
      return 0;
    }
  }

  /**
   * Get all configured bot names
   */
  public getBotNames(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get configuration for a specific bot
   */
  public getBotConfig(botName: string): any {
    return this.botConfigs.get(botName);
  }
}

export default MattermostService;