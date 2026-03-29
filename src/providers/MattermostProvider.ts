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

  getSchema() {
    return mattermostConfig.getSchema();
  }

  getConfig() {
    return mattermostConfig;
  }

  getSensitiveKeys() {
    return ['MATTERMOST_TOKEN'];
  }

  /**
   * Retrieves the status of configured Mattermost bots.
   * Note: This currently simulates connection status and should be updated
   * to perform a real API check in the future.
   */
  async getStatus() {
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

  getBotNames() {
    return this.mattermostService.getBotNames();
  }

  /**
   * Retrieves the current list of bots.
   */
  async getBots() {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: any) {
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
                'Authorization': `Bearer ${token}`,
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
        r.status === 'fulfilled' ? r.value : { name: 'unknown', connected: false, error: 'Health check failed' }
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
