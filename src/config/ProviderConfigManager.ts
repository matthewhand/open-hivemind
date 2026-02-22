import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { v4 as uuidv4 } from 'uuid';

const debug = Debug('app:providerConfigManager');

export interface ProviderInstance {
  id: string;
  type: string; // 'discord', 'slack', 'openai', etc.
  category: 'message' | 'llm';
  name: string;
  enabled: boolean;
  config: Record<string, any>; // Provider-specific config (token, model, etc.)
}

export interface ProviderStore {
  message: ProviderInstance[];
  llm: ProviderInstance[];
}

export class ProviderConfigManager {
  private static instance: ProviderConfigManager;
  private configPath: string;
  private store: ProviderStore = { message: [], llm: [] };
  private initialized = false;

  private constructor() {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    // Ensure providers directory exists
    const providersDir = path.join(configDir, 'providers');
    if (!fs.existsSync(providersDir)) {
      fs.mkdirSync(providersDir, { recursive: true });
    }
    this.configPath = path.join(providersDir, 'instances.json');
    this.loadConfig();

    // Migration: If empty, try to populate from legacy sources (one-time)
    if (this.store.message.length === 0 && this.store.llm.length === 0) {
      this.migrateLegacyConfigs();
    }
  }

  public static getInstance(): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager();
    }
    return ProviderConfigManager.instance;
  }

  /**
   * Interpolate ${ENV_VAR} patterns in config values with actual environment variables
   */
  private interpolateEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
        const value = process.env[envVar] || '';
        debug(`Interpolating \${${envVar}} -> "${value}" (env available: ${!!process.env[envVar]})`);
        return value;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateEnvVars(item));
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.interpolateEnvVars(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Interpolate ${ENV_VAR} patterns with actual env values
        this.store = this.interpolateEnvVars(parsed);
        debug(`Loaded ${this.store.message.length} message and ${this.store.llm.length} llm providers`);
      } else {
        this.store = { message: [], llm: [] };
        this.saveConfig();
      }
      this.initialized = true;
    } catch (error) {
      debug('Error loading provider config:', error);
      this.store = { message: [], llm: [] };
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.store, null, 2));
      debug('Saved provider config');
    } catch (error) {
      debug('Error saving provider config:', error);
    }
  }

  /**
   * One-time migration from environment variables/legacy configs to instances
   */
  private migrateLegacyConfigs(): void {
    debug('Migrating legacy configs...');
    let changed = false;

    // Discord
    const discordToken = process.env.DISCORD_BOT_TOKEN;
    if (discordToken) {
      const tokens = discordToken.split(',');
      tokens.forEach((token, idx) => {
        if (token.trim()) {
          this.store.message.push({
            id: `discord-${idx === 0 ? 'default' : uuidv4()}`,
            type: 'discord',
            category: 'message',
            name: idx === 0 ? 'Default Discord Bot' : `Discord Bot ${idx + 2}`,
            enabled: true,
            config: { token: token.trim() },
          });
          changed = true;
        }
      });
    }

    // OpenAI
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      this.store.llm.push({
        id: 'openai-default',
        type: 'openai',
        category: 'llm',
        name: 'Default OpenAI',
        enabled: true,
        config: {
          apiKey: openAiKey,
          model: process.env.OPENAI_MODEL || 'gpt-4',
        },
      });
      changed = true;
    }

    // Ollama
    const ollamaUrl = process.env.OLLAMA_BASE_URL;
    if (ollamaUrl) {
      this.store.llm.push({
        id: 'ollama-default',
        type: 'ollama',
        category: 'llm',
        name: 'Local Ollama',
        enabled: true,
        config: {
          baseUrl: ollamaUrl,
          model: process.env.OLLAMA_MODEL || 'llama2',
        },
      });
      changed = true;
    }

    if (changed) {
      this.saveConfig();
      debug('Migration complete');
    }
  }

  // CRUD Operations

  public getAllProviders(category?: 'message' | 'llm'): ProviderInstance[] {
    if (category) {
      return this.store[category];
    }
    return [...this.store.message, ...this.store.llm];
  }

  public getProvider(id: string): ProviderInstance | undefined {
    return [...this.store.message, ...this.store.llm].find(p => p.id === id);
  }

  public createProvider(data: Omit<ProviderInstance, 'id'>): ProviderInstance {
    const newInstance: ProviderInstance = {
      ...data,
      id: uuidv4(), // Generate ID
    };

    if (newInstance.category === 'message') {
      this.store.message.push(newInstance);
    } else {
      this.store.llm.push(newInstance);
    }

    this.saveConfig();
    return newInstance;
  }

  public updateProvider(id: string, updates: Partial<ProviderInstance>): ProviderInstance | null {
    let target = this.store.message.find(p => p.id === id);

    if (!target) {
      target = this.store.llm.find(p => p.id === id);
    }

    if (!target) {return null;}

    // Merge updates
    Object.assign(target, updates);
    // Ensure category/id/type are immutable if needed? For now allow update except ID
    target.id = id;

    this.saveConfig();
    return target;
  }

  public deleteProvider(id: string): boolean {
    const msgIdx = this.store.message.findIndex(p => p.id === id);
    if (msgIdx !== -1) {
      this.store.message.splice(msgIdx, 1);
      this.saveConfig();
      return true;
    }

    const llmIdx = this.store.llm.findIndex(p => p.id === id);
    if (llmIdx !== -1) {
      this.store.llm.splice(llmIdx, 1);
      this.saveConfig();
      return true;
    }

    return false;
  }
}

export default ProviderConfigManager;
