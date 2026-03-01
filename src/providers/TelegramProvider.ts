import * as fs from 'fs';
import * as path from 'path';
import telegramConfig, { type TelegramConfig } from '../config/telegramConfig';
import { type IMessageProvider } from '../types/IProvider';
import { type Message } from '../types/messages';

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

    const bots = await Promise.all(
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

    return {
      ok: true,
      bots,
      count: bots.length,
    };
  }

  /**
   * Retrieves the names of configured Telegram bots.
   * Currently returns an empty array as names are not indexed.
   */
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

    console.log(`[TelegramProvider] Added bot configuration for ${name || 'unnamed'}`);
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
    throw new Error('Method not implemented.');
  }

  async getMessages(channelId: string, limit?: number): Promise<Message[]> {
    throw new Error('Method not implemented.');
  }

  async sendMessageToChannel(
    channelId: string,
    message: string,
    active_agent_name?: string
  ): Promise<string> {
    throw new Error('Method not implemented.');
  }

  getClientId(): string {
    return 'telegram';
  }

  async getForumOwner(forumId: string): Promise<string> {
    return '';
  }
}
