import Debug from 'debug';
import { UserConfigStore } from './UserConfigStore';
import ProviderConfigManager from './ProviderConfigManager';
import type { ProviderInstance } from './ProviderConfigManager';
import { BotConfigurationManager } from './BotConfigurationManager';
import { SecureConfigManager } from './SecureConfigManager';
import { getLlmProfileByKey, getLlmProfiles } from './llmProfiles';
import { getMemoryProfileByKey } from './memoryProfiles';
import { getToolProfileByKey } from './toolProfiles';

const debug = Debug('app:config-store');

export interface ProviderProfile {
  key: string;
  name: string;
  provider: string;
  config: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * ConfigStore — single facade over the 5 existing config systems.
 *
 * Layered precedence (highest → lowest):
 *   1. Environment variables
 *   2. Provider config (ProviderConfigManager)
 *   3. User config (UserConfigStore)
 *   4. Profile configs (llm/memory/tool profiles)
 *   5. Defaults
 *
 * This class delegates to existing managers — it does NOT replace them.
 */
export class ConfigStore {
  private static instance: ConfigStore | null = null;

  static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore();
    }
    return ConfigStore.instance;
  }

  private constructor() {}

  // ---------------------------------------------------------------------------
  // Layered get: env > user > default
  // ---------------------------------------------------------------------------

  /**
   * Retrieve a config value by key, checking layers in precedence order:
   * env → user settings → undefined.
   */
  get<T = unknown>(key: string): T | undefined {
    // 1. Environment variable (highest precedence)
    const envVal = process.env[key];
    if (envVal !== undefined) return envVal as unknown as T;

    // 2. Secure config (encrypted secrets)
    try {
      const scm = (SecureConfigManager as any).getInstanceSync?.();
      if (scm && typeof scm.getDecryptedMainConfigSync === 'function') {
        const decrypted = scm.getDecryptedMainConfigSync();
        if (decrypted && typeof decrypted === 'object' && key in decrypted) {
          return decrypted[key] as T;
        }
      }
    } catch { /* SecureConfigManager not available */ }

    // 3. User settings
    const userVal = this.getUserSetting(key);
    if (userVal !== undefined) return userVal as T;

    return undefined;
  }

  /**
   * Like `get()` but throws when the key is missing from every layer.
   */
  getRequired<T = unknown>(key: string): T {
    const val = this.get<T>(key);
    if (val === undefined) {
      throw new Error(`Required config key "${key}" not found in any layer`);
    }
    return val;
  }

  // ---------------------------------------------------------------------------
  // Direct layer accessors
  // ---------------------------------------------------------------------------

  /** Read a single environment variable. */
  getEnv(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Return all provider instances for a given category.
   * Delegates to ProviderConfigManager.
   */
  getProviderConfig(category: 'llm' | 'memory' | 'tool' | 'messenger'): ProviderInstance[] {
    try {
      // ProviderConfigManager uses 'message' not 'messenger'
      const mapped = category === 'messenger' ? 'message' : category;
      return ProviderConfigManager.getInstance().getAllProviders(mapped);
    } catch {
      return [];
    }
  }

  /** Read a single key from UserConfigStore general settings. */
  getUserSetting(key: string): unknown {
    try {
      const store = UserConfigStore.getInstance();
      const general = store.getGeneralSettings();
      return (general as Record<string, unknown>)?.[key];
    } catch {
      return undefined;
    }
  }

  /** Write a single key into UserConfigStore general settings. */
  async setUserSetting(key: string, value: unknown): Promise<void> {
    const store = UserConfigStore.getInstance();
    const general = store.getGeneralSettings();
    await store.setGeneralSettings({ ...general, [key]: value });
  }

  /**
   * Return the full BotConfig for a named bot.
   * Delegates to BotConfigurationManager.
   */
  getBotConfig(botName: string): Record<string, unknown> {
    try {
      const bot = BotConfigurationManager.getInstance().getBot(botName);
      return (bot as unknown as Record<string, unknown>) ?? {};
    } catch {
      return {};
    }
  }

  // ---------------------------------------------------------------------------
  // Profile accessors
  // ---------------------------------------------------------------------------

  /**
   * Look up a single profile by type and key.
   * Delegates to the matching profile loader.
   */
  getProfile(type: 'llm' | 'memory' | 'tool', key: string): ProviderProfile | undefined {
    try {
      switch (type) {
        case 'llm':
          return getLlmProfileByKey(key) as ProviderProfile | undefined;
        case 'memory':
          return getMemoryProfileByKey(key) as ProviderProfile | undefined;
        case 'tool':
          return getToolProfileByKey(key) as ProviderProfile | undefined;
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Return all profiles for a given type.
   */
  getAllProfiles(type: 'llm' | 'memory' | 'tool'): ProviderProfile[] {
    try {
      switch (type) {
        case 'llm':
          return getLlmProfiles().llm as ProviderProfile[];
        case 'memory':
          return loadMemoryProfiles().memory as ProviderProfile[];
        case 'tool':
          return loadToolProfiles().tool as ProviderProfile[];
      }
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // General settings pass-through
  // ---------------------------------------------------------------------------

  getGeneralSettings(): Record<string, unknown> {
    try {
      return UserConfigStore.getInstance().getGeneralSettings();
    } catch {
      return {};
    }
  }

  async setGeneralSettings(settings: Record<string, unknown>): Promise<void> {
    await UserConfigStore.getInstance().setGeneralSettings(settings);
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Identify which layer a given key originates from.
   */
  getSource(key: string): 'env' | 'secure' | 'provider' | 'user' | 'profile' | 'default' | undefined {
    if (process.env[key] !== undefined) return 'env';
    try {
      const scm = (SecureConfigManager as any).getInstanceSync?.();
      if (scm && typeof scm.getDecryptedMainConfigSync === 'function') {
        const decrypted = scm.getDecryptedMainConfigSync();
        if (decrypted && typeof decrypted === 'object' && key in decrypted) return 'secure';
      }
    } catch { /* not available */ }
    if (this.getUserSetting(key) !== undefined) return 'user';
    return undefined;
  }

  /**
   * Return a map of known config keys → source layer for diagnostic UIs.
   */
  getAllSources(): Record<string, string> {
    const result: Record<string, string> = {};

    // User settings
    const general = this.getGeneralSettings();
    for (const key of Object.keys(general)) {
      result[key] = 'user';
    }

    // Env vars override user settings — mark them as 'env' source
    for (const key of Object.keys(process.env)) {
      if (process.env[key] !== undefined) {
        result[key] = 'env';
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Signal that config should be re-read from disk.
   * Currently a no-op because the underlying stores re-read lazily,
   * but callers can use this to express intent.
   */
  reload(): void {
    debug('Reloading all config layers');
    // UserConfigStore and profiles re-read on access — nothing to do.
  }

  /**
   * Drop the singleton so a fresh instance is created on next access.
   * Useful in tests.
   */
  reset(): void {
    ConfigStore.instance = null;
    debug('ConfigStore reset');
  }
}
