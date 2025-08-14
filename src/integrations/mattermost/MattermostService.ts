import { IMessengerService } from '@message/interfaces/IMessengerService';
import { IMessage } from '@message/interfaces/IMessage';
// LLM providers are invoked by higher-level handlers; not needed here
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import MattermostClient from './mattermostClient';
import MattermostMessage from './MattermostMessage';
import { Application } from 'express';
// Routing (feature-flagged parity)
import messageConfig from '@config/messageConfig';
import { computeScore as channelComputeScore, pickBestChannel } from '@message/routing/ChannelRouter';
import Debug from 'debug';

const log = Debug('app:MattermostService');

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
  private handler?: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>;
  private joinTs: Map<string, number> = new Map();
  private selfIds: Map<string, string> = new Map();

  // Channel prioritization support hook (delegation gated by MESSAGE_CHANNEL_ROUTER_ENABLED)
  public supportsChannelPrioritization: boolean = true;

  private constructor() {
    log('Initializing MattermostService with multi-instance support');
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
      log('No Mattermost bot configurations found');
      return;
    }

    log(`Initializing ${mattermostBotConfigs.length} Mattermost bot instances`);
    
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
      log(`Invalid Mattermost configuration for bot: ${botName}`);
      return;
    }

    log(`Initializing Mattermost bot: ${botName}`);

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
    log('Initializing Mattermost connections...');
    
    for (const [botName, client] of this.clients) {
      try {
        await client.connect();
        this.joinTs.set(botName, Date.now());
        try {
          const me = await client.getSelfUserId();
          if (me) this.selfIds.set(botName, me);
        } catch {}
        log(`Connected to Mattermost server for bot: ${botName}`);
      } catch (error) {
        log(`Failed to connect to Mattermost for bot ${botName}: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }
  }

  public setApp(app: Application): void {
    this.app = app;
  }

  public setMessageHandler(handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>): void {
    this.handler = handler;
    log('Setting message handler for Mattermost bots');

    // Wire lightweight event forwarding if the client emits simulated events
    for (const [botName, client] of this.clients) {
      client.on('posted', async (post: any) => {
        try {
          // Ignore posts from bots/self
          const msg = new MattermostMessage(post);
          if (msg.isFromBot()) return;
          const selfId = this.selfIds.get(botName);
          if (selfId && post?.user_id === selfId) return;

          // Ignore backlog older than join timestamp
          const joinedAt = this.joinTs.get(botName) || 0;
          if (msg.getTimestamp().getTime() < joinedAt) return;

          const history = await this.fetchMessages(msg.getChannelId(), 10, botName);
          await handler(msg, history, this.botConfigs.get(botName));
        } catch (e) {
          // Swallow malformed events
          return;
        }
      });
    }
  }

  public async sendMessageToChannel(channelId: string, text: string, senderName?: string, threadId?: string): Promise<string> {
    const botName = senderName || Array.from(this.clients.keys())[0];
    const client = this.clients.get(botName);
    
    if (!client) {
      throw new Error(`Bot ${botName} not found`);
    }

    try {
      // Optional channel routing parity
      let selectedChannelId = channelId;
      try {
        const enabled = Boolean((messageConfig as any).get('MESSAGE_CHANNEL_ROUTER_ENABLED'));
        if (enabled) {
          const defaultChannel = this.getDefaultChannel();
          const candidates = Array.from(new Set([channelId, defaultChannel].filter(Boolean))) as string[];
          const picked = pickBestChannel(candidates, { provider: 'mattermost', botName });
          if (picked) selectedChannelId = picked;
        }
      } catch {}

      const id = await client.createPost(selectedChannelId, text, threadId);
      
      log(`[${botName}] Sent message to channel ${selectedChannelId}${threadId ? ` (thread ${threadId})` : ''}`);
      return id || Date.now().toString();
    } catch (error) {
      log(`[${botName}] Failed to send message: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  public async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    return this.fetchMessages(channelId, 10);
  }

  public async fetchMessages(channelId: string, limit: number = 10, botName?: string): Promise<IMessage[]> {
    const targetBot = botName || Array.from(this.clients.keys())[0];
    if (!this.clients.has(targetBot)) {
      log(`Bot ${targetBot} not found`);
      return [];
    }
    try {
      const client = this.clients.get(targetBot)!;
      const posts = await client.getChannelPosts(channelId, limit);
      const messages = posts.map(p => new MattermostMessage(p));
      return messages.slice(0, limit);
    } catch (e) {
      log(`Error fetching messages from ${channelId}: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
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
    log(`Joining Mattermost channel: ${channel}`);
    const firstBot = Array.from(this.clients.keys())[0];
    const client = this.clients.get(firstBot);
    if (!client) return;
    try {
      await client.joinChannel(channel);
      this.joinTs.set(firstBot, Date.now());
      log(`Joined Mattermost channel ${channel}`);
    } catch (e) {
      log(`Failed to join Mattermost channel ${channel}: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
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
    log('Shutting down MattermostService...');
    for (const [, client] of this.clients) {
      try { await (client as any).disconnect?.(); } catch {}
    }
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
    } catch {
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
