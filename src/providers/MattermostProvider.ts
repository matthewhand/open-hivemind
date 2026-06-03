import Debug from 'debug';
import { MattermostService } from '@hivemind/message-mattermost';
import mattermostConfig, { type MattermostConfig } from '../config/mattermostConfig';
import { type IMessageProvider } from '../types/IProvider';
import { isSafeUrl } from '../utils/ssrfGuard';
import { ReconnectionManager } from './ReconnectionManager';

const debug = Debug('app:providers:MattermostProvider');

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

  getSchema(): Record<string, unknown> {
    return mattermostConfig.getSchema();
  }

  getConfig(): Record<string, unknown> {
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
  async getStatus(): Promise<Record<string, unknown>> {
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
  async getBots(): Promise<Record<string, unknown>[]> {
    const status = await this.getStatus();
    return (status.bots as Record<string, unknown>[]) ?? [];
  }

  /**
   * Adds (or registers) a Mattermost bot instance.
   *
   * This persists the bot configuration to `config/providers/messengers.json`
   * (matching the pattern used by the other messenger providers) and wires a
   * {@link ReconnectionManager} that establishes a real connection via the
   * existing {@link MattermostService} client. The connection attempt runs
   * asynchronously under the reconnection manager, so a transient failure to
   * reach the Mattermost server never throws synchronously out of this method
   * and therefore cannot crash bot startup or affect other providers.
   *
   * @param config - Bot configuration. Requires `name`, `serverUrl` and `token`.
   * @throws If required fields (`name`, `serverUrl`, `token`) are missing.
   */
  async addBot(config: Record<string, unknown>): Promise<void> {
    const name = String(config.name ?? '').trim();
    const serverUrl = config.serverUrl as string | undefined;
    const token = config.token as string | undefined;
    const channel = (config.channel as string | undefined) || 'town-square';
    const userId = (config.userId as string | undefined) || '';
    const username = (config.username as string | undefined) || '';
    const llm = config.llm;

    if (!name || !serverUrl || !token) {
      throw new Error('name, serverUrl, and token are required');
    }

    // Persist to config/providers/messengers.json so the instance survives
    // restarts and can be picked up by reload(), mirroring SlackProvider.
    const fs = await import('fs');
    const path = await import('path');
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: any = { mattermost: { instances: [] } };
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch (e: unknown) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        debug('Failed reading messengers.json', e);
      }
    }

    cfg.mattermost = cfg.mattermost || { instances: [] };
    cfg.mattermost.instances = cfg.mattermost.instances || [];
    if (!cfg.mattermost.instances.some((i: any) => i.name === name)) {
      cfg.mattermost.instances.push({ name, serverUrl, token, channel, userId, username, llm });
    }

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e: unknown) {
      debug('Failed writing messengers.json', e);
    }

    // Establish a real connection via the existing MattermostService client,
    // managed (with exponential backoff + health checks) by ReconnectionManager.
    const mattermost = this.mattermostService;
    const reconManager = new ReconnectionManager(
      `mattermost-${name}`,
      async () => {
        // MattermostService.initialize() connects every configured client.
        // It is idempotent enough for our needs: calling connect() simply
        // re-validates the token against /users/me.
        await mattermost.initialize();
      },
      {
        healthCheckFn: async () => {
          try {
            if (!serverUrl || !token) return false;

            const targetUrl = `${serverUrl.replace(/\/$/, '')}/api/v4/users/me`;
            const check = await isSafeUrl(targetUrl);
            if (!check.safe) return false;

            const response = await fetch(targetUrl, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            return response.ok;
          } catch {
            return false;
          }
        },
        healthCheckIntervalMs: 30000,
      }
    );
    this.reconManagers.set(name, reconManager);

    // Start asynchronously. Any connection failure is handled by the
    // ReconnectionManager (backoff/retry) and never propagates here, so
    // startup and other providers are unaffected.
    reconManager.start().catch((err: Error) => {
      debug(`Failed to start Mattermost bot ${name}: ${err.message}`);
    });
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
  async getMessages(channelId: string, limit?: number): Promise<unknown[]> {
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
    } catch {
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
            // eslint-disable-next-line unused-imports/no-unused-vars
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

                const targetUrl = `${inst.serverUrl}/api/v4/users/me`;
                const check = await isSafeUrl(targetUrl);
                if (!check.safe) {
                  return false;
                }

                const response = await fetch(targetUrl, {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${inst.token}`,
                    'Content-Type': 'application/json',
                  },
                });

                return response.ok;
              } catch {
                return false;
              }
            },
            healthCheckIntervalMs: 30000,
          }
        );

        this.reconManagers.set(nameToUse, reconManager);
        reconManager.start().catch((_err) => {
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

            const targetUrl = `${serverUrl}/api/v4/users/me`;
            if (!(await isSafeUrl(targetUrl))) {
              return {
                name,
                connected: false,
                error: 'Unsafe server URL',
              };
            }

            const response = await fetch(targetUrl, {
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
          } catch (e: unknown) {
            return {
              name,
              connected: false,
              error:
                (e instanceof Error ? e.message : String(e)) ||
                'Failed to connect to Mattermost API',
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
    } catch (e: unknown) {
      return {
        status: 'down',
        connected: false,
        details: 'Health check failed',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
