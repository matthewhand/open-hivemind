import * as fs from 'fs';
import * as path from 'path';
import Debug from 'debug';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import Logger from '../common/logger';

const debug = Debug('app:providerConfigManager');

export const ProviderInstanceSchema = z.object({
  id: z.string().min(1, 'Provider ID cannot be empty'),
  type: z.string().min(1, 'Provider type cannot be empty'), // 'discord', 'slack', 'openai', etc.
  category: z.enum(['message', 'llm']),
  name: z.string().min(1, 'Provider name cannot be empty'),
  enabled: z.boolean(),
  config: z.record(z.string(), z.any()), // Provider-specific config (token, model, etc.)
});

export const ProviderStoreSchema = z.object({
  message: z.array(ProviderInstanceSchema).default([]),
  llm: z.array(ProviderInstanceSchema).default([]),
});

export type ProviderInstance = z.infer<typeof ProviderInstanceSchema>;
export type ProviderStore = z.infer<typeof ProviderStoreSchema>;

class ProviderConfigManager {
  private static instance: ProviderConfigManager;
  private configPath: string;
  private store: ProviderStore = { message: [], llm: [] };
  private initialized = false;

  private constructor(configPathOverride?: string) {
    if (configPathOverride) {
      this.configPath = configPathOverride;
    } else {
      const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
      const providersDir = path.join(configDir, 'providers');
      if (!fs.existsSync(providersDir)) {
        fs.mkdirSync(providersDir, { recursive: true });
      }
      this.configPath = path.join(providersDir, 'instances.json');
    }

    this.loadConfig();

    // Migration: If empty, try to populate from legacy sources (one-time)
    if (this.store.message.length === 0 && this.store.llm.length === 0) {
      this.migrateLegacyConfigs();
    }
  }

  public static getInstance(configPathOverride?: string): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager(configPathOverride);
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
      return obj.map((item) => this.interpolateEnvVars(item));
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

  /**
   * Performs Zod validation strictly, exiting the process on failure to guarantee fail-fast startup.
   */
  public validateConfigRaw(parsed: any): ProviderStore {
    const validationResult = ProviderStoreSchema.safeParse(parsed);
    if (!validationResult.success) {
      Logger.error('---------------------------------------------------------');
      Logger.error('🚨 CRITICAL STARTUP FAILURE: MALFORMED PROVIDER CONFIG');
      Logger.error('---------------------------------------------------------');
      Logger.error(`The configuration file at ${this.configPath} is invalid:`);
      validationResult.error.errors.forEach((e) => {
        Logger.error(` - ${e.path.join('.')}: ${e.message}`);
      });
      Logger.error('---------------------------------------------------------');
      Logger.error('Please fix or remove the instances.json file. Exiting now to prevent data loss.');
      process.exit(1);
    }
    return validationResult.data;
  }

  private loadConfig(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Validate parsed config immediately to fail fast
        const validatedData = this.validateConfigRaw(parsed);

        // Interpolate ${ENV_VAR} patterns with actual env values
        this.store = this.interpolateEnvVars(validatedData);
        debug(`Loaded ${this.store.message.length} message and ${this.store.llm.length} llm providers`);
      } catch (error) {
        // This catches JSON.parse errors
        Logger.error('---------------------------------------------------------');
        Logger.error('🚨 CRITICAL STARTUP FAILURE: CORRUPT PROVIDER CONFIG FILE');
        Logger.error('---------------------------------------------------------');
        Logger.error(`Failed to parse instances.json at ${this.configPath}:`);
        Logger.error(error instanceof Error ? error.message : String(error));
        Logger.error('---------------------------------------------------------');
        Logger.error('Please ensure the file is valid JSON. Exiting now.');
        process.exit(1);
        return;
      }
    } else {
      this.store = { message: [], llm: [] };
      this.saveConfig();
    }
    this.initialized = true;
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
    return [...this.store.message, ...this.store.llm].find((p) => p.id === id);
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
    let target = this.store.message.find((p) => p.id === id);

    if (!target) {
      target = this.store.llm.find((p) => p.id === id);
    }

    if (!target) {
      return null;
    }

    // Merge updates
    Object.assign(target, updates);
    // Ensure category/id/type are immutable if needed? For now allow update except ID
    target.id = id;

    this.saveConfig();
    return target;
  }

  public deleteProvider(id: string): boolean {
    const msgIdx = this.store.message.findIndex((p) => p.id === id);
    if (msgIdx !== -1) {
      this.store.message.splice(msgIdx, 1);
      this.saveConfig();
      return true;
    }

    const llmIdx = this.store.llm.findIndex((p) => p.id === id);
    if (llmIdx !== -1) {
      this.store.llm.splice(llmIdx, 1);
      this.saveConfig();
      return true;
    }

    return false;
  }
}

export default ProviderConfigManager;
