import * as fs from 'fs';
import * as path from 'path';
import telegramConfig, { type TelegramConfig } from '../config/telegramConfig';
import { type IMessageProvider } from '../types/IProvider';
import { type Message } from '../types/messages';
import Debug from 'debug';
const debug = Debug('app:providers:TelegramProvider');

/**
 * Telegram bot token format: <bot_id>:<token_string>
 * bot_id is a sequence of digits; token_string is 35 alphanumeric/underscore/hyphen chars.
 */
const TELEGRAM_TOKEN_REGEX = /^\d+:[A-Za-z0-9_-]{35,}$/;

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
  id = 'telegram';
  label = 'Telegram';
  type = 'messenger' as const;
  docsUrl = 'https://core.telegram.org/bots/api';
  helpText = 'Create a Telegram bot using BotFather and get the API token.';

  getSchema() {
    return telegramConfig.getSchema();
  }

  getConfig() {
    return telegramConfig;
  }

  getSensitiveKeys() {
    return ['TELEGRAM_BOT_TOKEN'];
  }

  async getStatus() {
    // We read directly from messengers.json (as in reload and addBot)
    // because dynamic bot instances are stored there, rather than in the convict config.
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let instances: any[] = [];
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      const cfg = JSON.parse(content);
      instances = cfg.telegram?.instances || [];
    } catch (e: any) {
      // Ignore reading or parsing errors, instances will be empty
    }

    const botPromises = await Promise.allSettled(
      instances.map(async (inst: any) => {
        let connected = false;
        try {
          const response = await fetch(`https://api.telegram.org/bot${inst.token}/getMe`);
          const data = await response.json();
          connected = data.ok === true;
        } catch (e) {
          // fetch error
          connected = false;
        }
        return {
          provider: 'telegram',
          name: inst.name || 'telegram',
          connected,
        };
      })
    );

    const bots = botPromises.map((r: any) =>
      r.status === 'fulfilled'
        ? r.value
        : { provider: 'telegram', name: 'unknown', connected: false }
    );

    return {
      ok: true,
      bots,
      count: bots.length,
    };
  }

  getBotNames() {
    return [];
  }

  async getBots() {
    const status = await this.getStatus();
    return status.bots;
  }

  async addBot(config: any) {
    const { name, token, llm } = config;

    // Issue 1: Validate token format before persisting
    validateTelegramToken(token);

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: any = { telegram: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      // Issue 3: Distinguish JSON parse errors from missing-file errors so that
      // corrupted config files are surfaced to administrators rather than silently
      // overwritten with a fresh default.
      try {
        cfg = JSON.parse(fileContent);
      } catch (parseErr: any) {
        throw new Error(
          `messengers.json is corrupted and cannot be parsed: ${parseErr.message}. ` +
            `Please fix or remove ${messengersPath} before adding a new bot.`
        );
      }
    } catch (readErr: any) {
      // Only swallow ENOENT (file not found); re-throw everything else including
      // the JSON parse error wrapped above.
      if (readErr.code !== 'ENOENT') {
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
    cfg.telegram.instances.push({ name: name || '', token, llm });

    // Issue 2: Propagate write errors instead of swallowing them silently.
    // A failed write would leave the in-memory state inconsistent with disk.
    await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
    await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), {
      encoding: 'utf8',
      mode: 0o600, // owner read/write only — tokens are sensitive
    });

    debug(`[TelegramProvider] Added bot configuration for ${name || 'unnamed'}`);
  }

  async reload() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');
    let cfg: any;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      // Issue 3: Surface JSON parse errors during reload so administrators are
      // alerted to corrupted config files rather than silently getting 0 bots.
      try {
        cfg = JSON.parse(content);
      } catch (parseErr: any) {
        throw new Error(
          `messengers.json is corrupted and cannot be parsed: ${parseErr.message}. ` +
            `Please fix or remove ${messengersPath}.`
        );
      }
    } catch (readErr: any) {
      if (readErr.code === 'ENOENT') {
        return { added: 0 };
      }
      throw readErr;
    }

    let added = 0;
    const instances = cfg.telegram?.instances || [];

    // TODO: Implement actual runtime reload logic once the Service is ready
    for (const inst of instances) {
      // Mock loading
      added++;
    }
    return { added };
  }

  async sendMessage(channelId: string, message: string, senderName?: string): Promise<string> {
    // Get the first configured bot instance to send the message
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let instances: any[] = [];
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      const cfg = JSON.parse(content);
      instances = cfg.telegram?.instances || [];
    } catch (e: any) {
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
    } catch (error: any) {
      debug(`[TelegramProvider] Failed to send message: ${error.message}`);
      throw new Error(`Failed to send Telegram message: ${error.message}`);
    }
  }

  async getMessages(channelId: string, limit?: number): Promise<Message[]> {
    // Telegram Bot API doesn't provide a method to fetch message history
    // This would require storing messages in a local database or using a user client (not bot API)
    // For now, return empty array with a debug message
    debug('[TelegramProvider] getMessages not fully implemented - Telegram Bot API does not support message history retrieval');
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
        const owner = data.result.find((admin: any) => admin.status === 'creator');
        if (owner) {
          return owner.user.id.toString();
        }
        // Fallback to first admin if no explicit owner
        return data.result[0].user.id.toString();
      }
    } catch (e: any) {
      debug(`[TelegramProvider] Failed to get forum owner: ${e.message}`);
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

    let instances: any[] = [];
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      const cfg = JSON.parse(content);
      instances = cfg.telegram?.instances || [];
    } catch (e: any) {
      return {
        status: 'down',
        connected: false,
        details: 'No Telegram bot instances configured',
        error: e.message,
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
      instances.map(async (inst: any) => {
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
        } catch (e: any) {
          return {
            connected: false,
            name: inst.name || 'telegram',
            error: e.message || 'Failed to connect to Telegram API',
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
