import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import telegramConfig, { type TelegramConfig } from '../config/telegramConfig';
import { type IMessageProvider } from '../types/IProvider';
import { type Message } from '../types/messages';
import { ReconnectionManager } from './ReconnectionManager';

const debug = Debug('app:providers:TelegramProvider');

/**
 * Telegram bot token format: <bot_id>:<token_string>
 * bot_id is a sequence of digits; token_string is 35 alphanumeric/underscore/hyphen chars.
 */
const TELEGRAM_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{35,}$/;

/**
 * Masks any Telegram bot token found in a string (e.g. a URL) so that it
 * is safe to include in log output.  The bot-id prefix is kept for
 * identification; the secret portion is replaced with asterisks.
 */
function maskToken(value: string): string {
  // Match the bot<id>:<secret> pattern inside the string
  return value.replace(/(\d+):[A-Za-z0-9_-]{35,}/g, '$1:****');
}

function validateTelegramToken(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new Error('Telegram bot token is required');
  }
  if (!TELEGRAM_TOKEN_REGEX.test(token)) {
    throw new Error(
      'Invalid Telegram bot token format. Expected format: <bot_id>:<35+ alphanumeric chars> ' +
        '(obtain from @BotFather)'
    );
  }
}

export class TelegramProvider implements IMessageProvider<TelegramConfig> {
  private reconManagers: Map<string, ReconnectionManager> = new Map();
  id = 'telegram';
  label = 'Telegram';
  type = 'messenger' as const;
  docsUrl = 'https://core.telegram.org/bots/api';
  helpText = 'Create a Telegram bot using BotFather and get the API token.';

  getSchema(): Record<string, unknown> {
    return telegramConfig.getSchema() as unknown as Record<string, unknown>;
  }

  getConfig(): typeof telegramConfig {
    return telegramConfig;
  }

  getSensitiveKeys(): string[] {
    return ['TELEGRAM_BOT_TOKEN'];
  }

  async getStatus(): Promise<{
    ok: boolean;
    bots: Array<{
      provider: string;
      name: string;
      connected: boolean;
      status?: Record<string, unknown>;
    }>;
    count: number;
  }> {
    // We read directly from messengers.json (as in reload and addBot)
    // because dynamic bot instances are stored there, rather than in the convict config.
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let instances: Array<{ name?: string; token: string; llm?: string }> = [];
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      const cfg = JSON.parse(content) as Record<string, unknown>;
      const telegramCfg = cfg.telegram as Record<string, unknown> | undefined;
      instances = (telegramCfg?.instances as typeof instances) || [];
    } catch {
      // Ignore reading or parsing errors, instances will be empty
    }

    const botPromises = await Promise.allSettled(
      instances.map(async (inst) => {
        let connected = false;
        const name = inst.name || 'telegram';
        const reconManager = this.reconManagers.get(name);

        if (reconManager) {
          connected = reconManager.getStatus().state === 'connected';
        } else {
          try {
            const url = `https://api.telegram.org/bot${inst.token}/getMe`;
            const response = await fetch(url);
            if (!response.ok) {
              debug(`[TelegramProvider] HTTP ${response.status} from ${maskToken(url)}`);
              connected = false;
            } else {
              const data = await response.json();
              connected = data.ok === true;
            }
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            debug(
              `[TelegramProvider] Fetch error for ${maskToken(`bot${inst.token}`)}: ${message}`
            );
            connected = false;
          }
        }

        return {
          provider: 'telegram',
          name,
          connected,
          status: (reconManager
            ? reconManager.getStatus()
            : { state: connected ? 'connected' : 'disconnected' }) as Record<string, unknown>,
        };
      })
    );

    const bots = botPromises.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { provider: 'telegram' as const, name: 'unknown', connected: false }
    );

    return {
      ok: true,
      bots,
      count: bots.length,
    };
  }

  getBotNames(): string[] {
    return [];
  }

  async getBots(): Promise<
    Array<{ provider: string; name: string; connected: boolean; status?: Record<string, unknown> }>
  > {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: { name?: string; token: string; llm?: string }): Promise<void> {
    const { name, token, llm } = config;

    // Issue 1: Validate token format before persisting
    validateTelegramToken(token);

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: Record<string, Record<string, unknown>> = { telegram: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      // Issue 3: Distinguish JSON parse errors from missing-file errors so that
      // corrupted config files are surfaced to administrators rather than silently
      // overwritten with a fresh default.
      try {
        cfg = JSON.parse(fileContent) as typeof cfg;
      } catch (parseErr: unknown) {
        const parseMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
        throw new Error(
          `messengers.json is corrupted and cannot be parsed: ${parseMessage}. ` +
            `Please fix or remove ${messengersPath} before adding a new bot.`
        );
      }
    } catch (readErr: unknown) {
      // Only swallow ENOENT (file not found); re-throw everything else including
      // the JSON parse error wrapped above.
      const isEnoent =
        readErr instanceof Error &&
        'code' in readErr &&
        (readErr as NodeJS.ErrnoException).code === 'ENOENT';
      if (!isEnoent) {
        throw readErr;
      }
      // File doesn't exist yet — start with the default empty structure.
    }

    cfg.telegram = cfg.telegram || {};
    cfg.telegram.instances = cfg.telegram.instances || [];

    // Issue 4: Tokens are sensitive credentials. We store them in the config file
    // because the Telegram SDK requires the plaintext token at runtime. To reduce
    // exposure we write the file with owner-read-only permissions (0o600) so that
    // other OS users cannot read it. Operators should additionally consider using
    // environment variables (TELEGRAM_BOT_TOKEN) or a secrets manager instead of
    // persisting tokens in config files.
    (cfg.telegram.instances as Array<{ name: string; token: string; llm?: string }>).push({
      name: name || '',
      token,
      llm,
    });

    // Issue 2: Propagate write errors instead of swallowing them silently.
    // A failed write would leave the in-memory state inconsistent with disk.
    await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
    await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), {
      encoding: 'utf8',
      mode: 0o600, // owner read/write only — tokens are sensitive
    });

    // We can also initialize ReconnectionManager when a new bot is added dynamically
    const botName = name || 'unnamed';
    const reconManager = new ReconnectionManager(`telegram-${botName}`, async () => {
      // Here we simulate telegram bot connection logic which checks /getMe
      const url = `https://api.telegram.org/bot${token}/getMe`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Telegram API returned HTTP ${response.status} for ${maskToken(url)}`);
      }
      const data = await response.json();
      if (!data.ok) {
        throw new Error('Telegram token validation failed during reconnection');
      }
    });
    this.reconManagers.set(botName, reconManager);
    reconManager.start().catch((err) => {
      debug(`Failed to start Telegram bot ${botName}: ${err.message}`);
    });

    debug(`[TelegramProvider] Added bot configuration for ${botName}`);
  }

  async reload(): Promise<{ added: number }> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: Record<string, Record<string, unknown>>;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      // Issue 3: Surface JSON parse errors during reload so administrators are
      // alerted to corrupted config files rather than silently getting 0 bots.
      try {
        cfg = JSON.parse(content) as typeof cfg;
      } catch (parseErr: unknown) {
        const parseMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
        throw new Error(
          `messengers.json is corrupted and cannot be parsed: ${parseMessage}. ` +
            `Please fix or remove ${messengersPath}.`
        );
      }
    } catch (readErr: unknown) {
      if (
        readErr instanceof Error &&
        'code' in readErr &&
        (readErr as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return { added: 0 };
      }
      throw readErr;
    }

    let added = 0;
    const instances = (cfg.telegram?.instances || []) as Array<{
      name?: string;
      token: string;
      llm?: string;
    }>;

    // Implemented actual runtime reload logic with ReconnectionManager
    for (const inst of instances) {
      const name = inst.name || 'unnamed';

      // Stop and replace existing manager if present
      const existingManager = this.reconManagers.get(name);
      if (existingManager) {
        existingManager.stop();
      }

      const reconManager = new ReconnectionManager(`telegram-${name}`, async () => {
        const url = `https://api.telegram.org/bot${inst.token}/getMe`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Telegram API returned HTTP ${response.status} for ${maskToken(url)}`);
        }
        const data = await response.json();
        if (!data.ok) {
          throw new Error(`Telegram connection failed for ${name}`);
        }
      });
      this.reconManagers.set(name, reconManager);
      reconManager.start().catch((err) => {
        debug(`Failed to start Telegram bot ${name} on reload: ${err.message}`);
      });

      added++;
    }
    return { added };
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    // Get the first configured bot instance to send the message
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let instances: Array<{ name?: string; token: string }> = [];
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      const cfg = JSON.parse(content) as Record<string, Record<string, unknown>>;
      instances = (cfg.telegram?.instances as typeof instances) || [];
    } catch {
      throw new Error('No Telegram bot instances configured');
    }

    if (instances.length === 0) {
      throw new Error('No Telegram bot instances available');
    }

    const botToken = instances[0].token;

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
      }

      return data.result.message_id.toString();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      debug(`[TelegramProvider] Failed to send message: ${message}`);
      throw new Error(`Failed to send Telegram message: ${message}`);
    }
  }

  async getMessages(channelId: string, limit?: number): Promise<Message[]> {
    // Telegram Bot API doesn't provide a method to fetch message history
    // This would require storing messages in a local database or using a user client (not bot API)
    // For now, return empty array with a debug message
    debug(
      '[TelegramProvider] getMessages not fully implemented - Telegram Bot API does not support message history retrieval'
    );
    return [];
  }

  async sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string
  ): Promise<string> {
    // For Telegram, sendMessageToChannel is the same as sendMessage
    // We can optionally prepend the agent name to the message
    const formattedMessage = active_agent_name
      ? `<b>${active_agent_name}</b>: ${message}`
      : message;

    return await this.sendMessage(channelId, formattedMessage);
  }

  getClientId(): string {
    // Return the bot ID from the first configured instance
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    try {
      const content = fs.readFileSync(messengersPath, 'utf8');
      const cfg = JSON.parse(content);
      const instances = cfg.telegram?.instances || [];

      if (instances.length > 0 && instances[0].token) {
        // Extract bot ID from token (format: <bot_id>:<token>)
        const botId = instances[0].token.split(':')[0];
        return botId;
      }
    } catch (e) {
      // Fallback to generic ID if config cannot be read
    }

    return 'telegram';
  }

  async getForumOwner(forumId: string): Promise<string> {
    // Get chat administrators to find the owner
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      const cfg = JSON.parse(content);
      const instances = cfg.telegram?.instances || [];

      if (instances.length === 0) {
        return '';
      }

      const botToken = instances[0].token;
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatAdministrators?chat_id=${forumId}`
      );
      const data = await response.json();

      if (data.ok && data.result && data.result.length > 0) {
        // Find the creator/owner (status: "creator")
        const owner = data.result.find(
          (admin: Record<string, unknown>) => admin.status === 'creator'
        );
        if (owner) {
          return owner.user.id.toString();
        }
        // Fallback to first admin if no explicit owner
        return data.result[0].user.id.toString();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      debug(`[TelegramProvider] Failed to get forum owner: ${message}`);
    }

    return '';
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    connected: boolean;
    lastPing?: Date;
    details?: string;
    error?: string;
  }> {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let instances: Array<{ name?: string; token: string }> = [];
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      const cfg = JSON.parse(content) as Record<string, Record<string, unknown>>;
      instances = (cfg.telegram?.instances as typeof instances) || [];
    } catch (e: unknown) {
      return {
        status: 'down',
        connected: false,
        details: 'No Telegram bot instances configured',
        error: e instanceof Error ? e.message : String(e),
      };
    }

    if (instances.length === 0) {
      return {
        status: 'down',
        connected: false,
        details: 'No Telegram bot instances available',
      };
    }

    // Check all instances and aggregate results
    const results = await Promise.allSettled(
      instances.map(async (inst) => {
        const startTime = Date.now();
        try {
          const response = await fetch(`https://api.telegram.org/bot${inst.token}/getMe`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          const data = await response.json();
          const latency = Date.now() - startTime;

          if (data.ok === true) {
            return {
              connected: true,
              name: inst.name || 'telegram',
              botUsername: data.result?.username,
              latency,
            };
          } else {
            return {
              connected: false,
              name: inst.name || 'telegram',
              error: data.description || 'Unknown error',
            };
          }
        } catch (e: unknown) {
          return {
            connected: false,
            name: inst.name || 'telegram',
            error:
              (e instanceof Error ? e.message : String(e)) || 'Failed to connect to Telegram API',
          };
        }
      })
    );

    const checkedInstances = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { connected: false, error: 'Health check failed' }
    );

    const connectedCount = checkedInstances.filter((i) => i.connected).length;
    const totalCount = instances.length;

    let status: 'healthy' | 'degraded' | 'down';
    if (connectedCount === totalCount) {
      status = 'healthy';
    } else if (connectedCount > 0) {
      status = 'degraded';
    } else {
      status = 'down';
    }

    const errors = checkedInstances.filter((i) => i.error).map((i) => i.error);

    return {
      status,
      connected: connectedCount > 0,
      lastPing: new Date(),
      details: `${connectedCount}/${totalCount} bot(s) connected`,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }
}
