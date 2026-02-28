import * as fs from 'fs';
import * as path from 'path';
import telegramConfig, { type TelegramConfig } from '../config/telegramConfig';
import { type IMessageProvider } from '../types/IProvider';
import { type Message } from '../types/messages';

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
    // TODO: Implement actual status check with Telegram API
    return {
      ok: true,
      bots: [],
      count: 0,
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
    if (!token) {
      throw new Error('token is required');
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const messengersPath = path.join(configDir, 'providers', 'messengers.json');

    let cfg: any = { telegram: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
      // Ignore if file doesn't exist
    }
    cfg.telegram = cfg.telegram || {};
    cfg.telegram.instances = cfg.telegram.instances || [];
    cfg.telegram.instances.push({ name: name || '', token, llm });

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed writing messengers.json', e);
    }

    // TODO: Runtime add
    console.log(`[TelegramProvider] Added bot configuration for ${name || 'unnamed'}`);
  }

  async reload() {
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
