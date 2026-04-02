import { MattermostService } from '@hivemind/message-mattermost';
import mattermostConfig, { type MattermostConfig } from '../config/mattermostConfig';
import { type IMessageProvider } from '../types/IProvider';
import { ReconnectionManager } from './ReconnectionManager';

export class MattermostProvider implements IMessageProvider<MattermostConfig> {
  private reconManagers: Map<string, ReconnectionManager> = new Map();
  id = 'mattermost';
  label = 'Mattermost';
  type = 'messenger' as const;
  docsUrl = 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/';
  helpText = 'Create a Mattermost bot account and generate a personal access token for it.';
  private mattermostService: MattermostService;

  constructor(mattermostService?: MattermostService) {
    this.mattermostService = mattermostService || MattermostService.getInstance();
  }

  getSchema(): any {
    return mattermostConfig.getSchema();
  }

  getConfig(): typeof mattermostConfig {
    return mattermostConfig;
  }

  getSensitiveKeys(): string[] {
    return ['MATTERMOST_TOKEN'];
  }

  /**
   * Retrieves the status of configured Mattermost bots.
   * Note: This currently simulates connection status and should be updated
   * to perform a real API check in the future.
   */
  async getStatus(): Promise<{ ok: boolean; bots: any[]; count: number }> {
    const mattermost = this.mattermostService;
    const botNames = mattermost.getBotNames();
    const bots = botNames.map((name: string) => {
      const cfg: any = mattermost.getBotConfig(name) || {};
      const reconManager = this.reconManagers.get(name);
      return {
        provider: 'mattermost',
        name,
        serverUrl: cfg.serverUrl || '',
        channel: cfg.channel || 'town-square',
        connected: reconManager ? reconManager.getStatus().state === 'connected' : true,
        status: reconManager ? reconManager.getStatus() : { state: 'connected' },
      };
    });
    return {
      ok: true,
      bots,
      count: bots.length,
    };
  }

  getBotNames(): string[] {
    return this.mattermostService.getBotNames();
  }

  /**
   * Retrieves the current list of bots.
   */
  async getBots(): Promise<any[]> {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: any): Promise<void> {
    const { name } = config;

    // Since MattermostProvider does not fully implement addBot yet, we
    // set up the foundation for the ReconnectionManager integration here.
    // When addBot is fully implemented, this manager should be initialized
    // and its `start` method called.

    const reconManager = new ReconnectionManager(
      `mattermost-${name || 'unnamed'}`,
      async () => {
        // Implementation for Mattermost connection goes here
        throw new Error('Method not implemented.');
      },
      {
        healthCheckFn: async () => false,
        healthCheckIntervalMs: 30000,
      }
    );
    this.reconManagers.set(name || 'unnamed', reconManager);

    // This will immediately fail until the underlying implementation is written,
    // but fulfills the ReconnectionManager interface requirements.
    reconManager.start().catch((err) => {
      // debug(`Failed to start Mattermost bot ${name}: ${err.message}`);
    });

    throw new Error('Method not implemented.');
  }

  /**
   * Sends a message to a specific channel.
   * @param channelId - The unique identifier of the target channel
   * @param message - The text content to send
   * @param senderName - Optional display name for the message sender
   * @returns A promise that resolves to the sent message's ID
   */
  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    return await this.mattermostService.sendMessageToChannel(channelId, message, senderName);
  }

  /**
   * Retrieves messages from a specific channel.
   * @param channelId - The unique identifier of the channel
   * @param limit - Optional maximum number of messages to retrieve
   * @returns A promise that resolves to an array of messages
   */
  async getMessages(channelId: string, limit?: number): Promise<any[]> {
    return await this.mattermostService.getMessagesFromChannel(channelId, limit);
  }

  /**
   * Sends a message to a channel with an optional agent name.
   * @param channelId - The unique identifier of the target channel
   * @param message - The text content to send
   * @param active_agent_name - Optional name of the active agent sending the message
   * @param threadId - Optional thread ID to reply in a specific thread
   * @returns A promise that resolves to the sent message's ID
   */
  async sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string,
    threadId?: string
  ): Promise<string> {
    return await this.mattermostService.sendMessageToChannel(
      channelId,
      message,
      active_agent_name,
      threadId
    );
  }

  /**
   * Gets the unique client identifier for this provider.
   * @returns The client ID for this provider
   */
  getClientId(): string {
    return this.mattermostService.getClientId();
  }

  /**
   * Gets the owner/creator of a message forum (channel, group, etc.)
   * @param forumId - The unique identifier of the forum (channel, group, etc.)
   * @returns A promise that resolves to the user ID of the forum owner
   */
  async getForumOwner(forumId: string): Promise<string> {
    return await this.mattermostService.getChannelOwnerId(forumId);
  }

  /**
   * Reloads the provider configuration and reconnects bots.
   * @returns A promise that resolves with the number of bots added
   */
  async reload(): Promise<{ added: number }> {
    const fs = await import('fs');
    const path = await import('path');

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: any;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch (e: any) {
      return { added: 0 };
    }

    let added = 0;
    const mattermost = this.mattermostService;
    const existing = new Set(mattermost.getBotNames());
    const instances = cfg.mattermost?.instances || [];

    for (const inst of instances) {
      const nm = inst.name || '';
      if (!nm || !existing.has(nm)) {
        const nameToUse = nm || `MattermostBot${Date.now()}`;

        const reconManager = new ReconnectionManager(
          `mattermost-${nameToUse}`,
          async () => {
            // Initialize bot instance
            const botConfig = {
              name: nameToUse,
              messageProvider: 'mattermost',
              mattermost: {
                serverUrl: inst.serverUrl,
                token: inst.token,
                channel: inst.channel || 'town-square',
                userId: inst.userId || '',
                username: inst.username || '',
              },
              llmProvider: inst.llm,
            };

            // Re-initialize the service with the new bot
            await mattermost.initialize();
          },
          {
            healthCheckFn: async () => {
              try {
                if (!inst.serverUrl || !inst.token) return false;

                const response = await fetch(`${inst.serverUrl}/api/v4/users/me`, {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${inst.token}`,
                    'Content-Type': 'application/json',
                  },
                });

                return response.ok;
              } catch (err) {
                return false;
              }
            },
            healthCheckIntervalMs: 30000,
          }
        );

        this.reconManagers.set(nameToUse, reconManager);
        reconManager.start().catch((err) => {
          // Errors are handled by ReconnectionManager
        });
        added++;
      }
    }

    return { added };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    connected: boolean;
    lastPing?: Date;
    details?: string;
    error?: string;
  }> {
    try {
      const mattermost = this.mattermostService;

      // Check if service is initialized
      if (!mattermost) {
        return {
          status: 'down',
          connected: false,
          details: 'Mattermost service not initialized',
        };
      }

      // Get all bot names
      const botNames = mattermost.getBotNames();

      if (botNames.length === 0) {
        return {
          status: 'down',
          connected: false,
          details: 'No Mattermost bots configured',
        };
      }

      // Check each bot's connection status
      const botStatuses = await Promise.allSettled(
        botNames.map(async (name: string) => {
          const cfg: any = mattermost.getBotConfig(name) || {};
          const serverUrl = cfg.serverUrl;
          const token = cfg.token;

          if (!serverUrl || !token) {
            return {
              name,
              connected: false,
              error: 'No server URL or token configured',
            };
          }

          try {
            // Use Mattermost API to test the connection
            const startTime = Date.now();
            const response = await fetch(`${serverUrl}/api/v4/users/me`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            const latency = Date.now() - startTime;

            if (response.ok) {
              const data = await response.json();
              return {
                name,
                connected: true,
                botId: data.id,
                username: data.username,
                latency,
              };
            } else {
              return {
                name,
                connected: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
              };
            }
          } catch (e: any) {
            return {
              name,
              connected: false,
              error: e.message || 'Failed to connect to Mattermost API',
            };
          }
        })
      );

      const checkedBots = botStatuses.map((r) =>
        r.status === 'fulfilled'
          ? r.value
          : { name: 'unknown', connected: false, error: 'Health check failed' }
      );

      const connectedCount = checkedBots.filter((b) => b.connected).length;
      const totalCount = botNames.length;

      let status: 'healthy' | 'degraded' | 'down';
      if (connectedCount === totalCount) {
        status = 'healthy';
      } else if (connectedCount > 0) {
        status = 'degraded';
      } else {
        status = 'down';
      }

      const errors = checkedBots.filter((b) => b.error).map((b) => b.error);

      return {
        status,
        connected: connectedCount > 0,
        lastPing: new Date(),
        details: `${connectedCount}/${totalCount} bot(s) connected`,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      };
    } catch (e: any) {
      return {
        status: 'down',
        connected: false,
        details: 'Health check failed',
        error: e.message,
      };
    }
  }
}
