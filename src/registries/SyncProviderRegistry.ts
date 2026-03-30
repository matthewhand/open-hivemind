/**
 * SyncProviderRegistry
 *
 * Replaces the ad-hoc async-on-every-call pattern with a single async
 * initialization at startup followed by synchronous O(1) Map lookups
 * in the hot path.
 *
 * Usage:
 *   const registry = SyncProviderRegistry.getInstance();
 *   await registry.initialize(config);          // once at startup
 *   const llm = registry.getLlmProvider('key'); // sync, zero I/O
 */

import Debug from 'debug';
import {
  loadPlugin,
  instantiateLlmProvider,
  instantiateMemoryProvider,
  instantiateToolProvider,
  instantiateMessageService,
} from '@src/plugins/PluginLoader';
import type { PluginModule } from '@src/plugins/PluginLoader';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMemoryProvider, IMessengerService, IToolProvider } from '@hivemind/shared-types';

const debug = Debug('app:sync-registry');

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Profile descriptor used during initialization. */
export interface ProviderProfile {
  /** Unique lookup key for this provider instance. */
  key: string;
  /** Plugin type identifier (e.g. 'openai', 'flowise', 'mem0'). */
  provider: string;
  /** Provider-specific configuration forwarded to the factory. */
  config: Record<string, unknown>;
}

/** Configuration passed to `initialize()`. */
export interface RegistryConfig {
  llmProfiles?: ProviderProfile[];
  memoryProfiles?: ProviderProfile[];
  toolProfiles?: ProviderProfile[];
  messengerPlatforms?: string[];
}

/** Result returned by `initialize()` summarizing what loaded and what failed. */
export interface InitResult {
  loaded: { llm: number; memory: number; messenger: number; tool: number };
  failed: Array<{ type: string; id: string; error: string }>;
}

/** Health status for a single provider. */
export interface ProviderHealthEntry {
  type: string;
  id: string;
  status: 'ok' | 'error' | 'unsupported';
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Registry implementation
// ---------------------------------------------------------------------------

export class SyncProviderRegistry {
  // -- Singleton plumbing ----------------------------------------------------

  private static instance: SyncProviderRegistry;

  private constructor() {}

  /** Return the singleton instance, creating it on first call. */
  public static getInstance(): SyncProviderRegistry {
    if (!SyncProviderRegistry.instance) {
      SyncProviderRegistry.instance = new SyncProviderRegistry();
    }
    return SyncProviderRegistry.instance;
  }

  // -- Internal state --------------------------------------------------------

  private _initialized = false;
  private _config: RegistryConfig = {};

  private readonly llmProviders = new Map<string, ILlmProvider>();
  private readonly memoryProviders = new Map<string, IMemoryProvider>();
  private readonly toolProviders = new Map<string, IToolProvider>();
  private readonly messengerServices = new Map<string, IMessengerService>();

  /**
   * Insertion-ordered list of LLM provider keys so we can resolve
   * "first registered" as the default without sorting.
   */
  private readonly llmInsertionOrder: string[] = [];

  // -- Initialization (the ONLY async method) --------------------------------

  /**
   * Load and validate ALL providers described in `config`.
   *
   * Each provider is loaded independently; a failure in one provider does
   * NOT prevent the rest from loading. Failures are collected and returned
   * in `InitResult.failed` so the caller can log or surface them.
   *
   * Calling `initialize()` a second time is a no-op. Call `reset()` first
   * if you need to re-initialize (e.g. after config changes).
   */
  public async initialize(config: RegistryConfig): Promise<InitResult> {
    if (this._initialized) {
      debug('initialize() called but registry is already initialized; skipping');
      return {
        loaded: this.getProviderCount(),
        failed: [],
      };
    }

    this._config = config;
    const failed: InitResult['failed'] = [];

    // -- LLM providers -------------------------------------------------------
    for (const profile of config.llmProfiles ?? []) {
      try {
        const mod = await loadPlugin(`llm-${profile.provider.toLowerCase()}`);
        const instance = instantiateLlmProvider(mod, profile.config);
        this.llmProviders.set(profile.key, instance);
        this.llmInsertionOrder.push(profile.key);
        debug('Loaded LLM provider: %s (%s)', profile.key, profile.provider);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        debug('Failed to load LLM provider %s: %s', profile.key, message);
        failed.push({ type: 'llm', id: profile.key, error: message });
      }
    }

    // -- Memory providers ----------------------------------------------------
    for (const profile of config.memoryProfiles ?? []) {
      try {
        const mod = await loadPlugin(`memory-${profile.provider.toLowerCase()}`);
        const instance = instantiateMemoryProvider(mod, profile.config);
        this.memoryProviders.set(profile.key, instance);
        debug('Loaded memory provider: %s (%s)', profile.key, profile.provider);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        debug('Failed to load memory provider %s: %s', profile.key, message);
        failed.push({ type: 'memory', id: profile.key, error: message });
      }
    }

    // -- Tool providers ------------------------------------------------------
    for (const profile of config.toolProfiles ?? []) {
      try {
        const mod = await loadPlugin(`tool-${profile.provider.toLowerCase()}`);
        const instance = instantiateToolProvider(mod, profile.config);
        this.toolProviders.set(profile.key, instance);
        debug('Loaded tool provider: %s (%s)', profile.key, profile.provider);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        debug('Failed to load tool provider %s: %s', profile.key, message);
        failed.push({ type: 'tool', id: profile.key, error: message });
      }
    }

    // -- Messenger services --------------------------------------------------
    for (const platform of config.messengerPlatforms ?? []) {
      try {
        const mod: PluginModule = await loadPlugin(`message-${platform.toLowerCase()}`);
        const instance = instantiateMessageService(mod, { __platform: platform });
        this.messengerServices.set(platform, instance);
        debug('Loaded messenger service: %s', platform);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        debug('Failed to load messenger service %s: %s', platform, message);
        failed.push({ type: 'messenger', id: platform, error: message });
      }
    }

    this._initialized = true;

    const loaded = this.getProviderCount();
    debug(
      'Initialization complete: %d LLM, %d memory, %d tool, %d messenger (%d failed)',
      loaded.llm,
      loaded.memory,
      loaded.tool,
      loaded.messenger,
      failed.length
    );

    return { loaded, failed };
  }

  // -- State queries ---------------------------------------------------------

  /** Whether `initialize()` has completed successfully. */
  public isInitialized(): boolean {
    return this._initialized;
  }

  /** Return counts per provider type. */
  public getProviderCount(): {
    llm: number;
    memory: number;
    messenger: number;
    tool: number;
  } {
    this.assertInitialized();
    return {
      llm: this.llmProviders.size,
      memory: this.memoryProviders.size,
      messenger: this.messengerServices.size,
      tool: this.toolProviders.size,
    };
  }

  // -- LLM lookups (all sync) ------------------------------------------------

  /**
   * Retrieve a registered LLM provider by its profile key.
   *
   * @throws Error if the registry has not been initialized.
   * @returns The provider instance, or `undefined` if no provider with
   *          that key was loaded.
   */
  public getLlmProvider(id: string): ILlmProvider | undefined {
    this.assertInitialized();
    return this.llmProviders.get(id);
  }

  /** Return all registered LLM providers as an array. */
  public getLlmProviders(): ILlmProvider[] {
    this.assertInitialized();
    return Array.from(this.llmProviders.values());
  }

  /**
   * Return the first LLM provider that was registered during initialization.
   *
   * This is the "system default" provider used when no explicit selection
   * is made.
   *
   * @throws Error if the registry has not been initialized or no LLM
   *         providers were loaded.
   */
  public getDefaultLlmProvider(): ILlmProvider | undefined {
    this.assertInitialized();
    if (this.llmInsertionOrder.length === 0) {
      return undefined;
    }
    const firstKey = this.llmInsertionOrder[0];
    return this.llmProviders.get(firstKey);
  }

  /**
   * Resolve the LLM provider for a specific bot.
   *
   * Resolution order:
   *   1. `botConfig.llmProvider` -- direct provider key
   *   2. `botConfig.llmProfileKey` -- profile key alias
   *   3. Default (first registered) provider
   *
   * @param botName   Human-readable bot name for debug logging.
   * @param botConfig The bot's configuration object.
   * @returns The resolved LLM provider instance.
   * @throws Error if the registry is not initialized or no LLM providers
   *         are registered.
   */
  public getLlmProviderForBot(
    botName: string,
    botConfig: Record<string, unknown>
  ): ILlmProvider {
    this.assertInitialized();

    // Try direct provider key
    const directKey = botConfig.llmProvider as string | undefined;
    if (directKey && this.llmProviders.has(directKey)) {
      debug('Bot "%s": resolved LLM provider via llmProvider key "%s"', botName, directKey);
      return this.llmProviders.get(directKey)!;
    }

    // Try profile key alias
    const profileKey = botConfig.llmProfileKey as string | undefined;
    if (profileKey && this.llmProviders.has(profileKey)) {
      debug('Bot "%s": resolved LLM provider via llmProfileKey "%s"', botName, profileKey);
      return this.llmProviders.get(profileKey)!;
    }

    // Fallback to default
    if (directKey || profileKey) {
      debug(
        'Bot "%s": requested LLM provider "%s" not found, falling back to default',
        botName,
        directKey || profileKey
      );
    }
    const defaultProvider = this.getDefaultLlmProvider();
    if (!defaultProvider) {
      throw new Error(`No LLM providers are registered — cannot resolve provider for bot "${botName}"`);
    }
    return defaultProvider;
  }

  // -- Memory lookups --------------------------------------------------------

  /**
   * Retrieve a registered memory provider by key.
   *
   * @throws Error if the registry has not been initialized.
   */
  public getMemoryProvider(id: string): IMemoryProvider | undefined {
    this.assertInitialized();
    return this.memoryProviders.get(id);
  }

  /** Return all registered memory providers as a Map keyed by ID. */
  public getMemoryProviders(): Map<string, IMemoryProvider> {
    this.assertInitialized();
    return new Map(this.memoryProviders);
  }

  // -- Tool lookups ----------------------------------------------------------

  /**
   * Retrieve a registered tool provider by key.
   *
   * @throws Error if the registry has not been initialized.
   */
  public getToolProvider(id: string): IToolProvider | undefined {
    this.assertInitialized();
    return this.toolProviders.get(id);
  }

  /** Return all registered tool providers as a Map keyed by ID. */
  public getToolProviders(): Map<string, IToolProvider> {
    this.assertInitialized();
    return new Map(this.toolProviders);
  }

  // -- Messenger lookups -----------------------------------------------------

  /**
   * Retrieve a registered messenger service by platform name.
   *
   * @throws Error if the registry has not been initialized.
   */
  public getMessengerService(platform: string): IMessengerService | undefined {
    this.assertInitialized();
    return this.messengerServices.get(platform);
  }

  /** Return all registered messenger services as a Map keyed by platform. */
  public getMessengerServices(): Map<string, IMessengerService> {
    this.assertInitialized();
    return new Map(this.messengerServices);
  }

  // -- Health checks ---------------------------------------------------------

  /**
   * Run health checks on all providers that expose a `healthCheck()` method.
   *
   * This is the only method (besides `initialize`) that performs async I/O;
   * it is intended for admin dashboards and readiness probes, not the hot path.
   */
  public async getHealthStatus(): Promise<ProviderHealthEntry[]> {
    this.assertInitialized();

    const entries: ProviderHealthEntry[] = [];

    // Memory providers
    for (const [id, provider] of this.memoryProviders) {
      try {
        if (typeof provider.healthCheck === 'function') {
          const result = await provider.healthCheck();
          entries.push({ type: 'memory', id, status: result.status, details: result.details });
        } else {
          entries.push({ type: 'memory', id, status: 'unsupported' });
        }
      } catch (err) {
        entries.push({
          type: 'memory',
          id,
          status: 'error',
          details: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    // Tool providers
    for (const [id, provider] of this.toolProviders) {
      try {
        if (typeof provider.healthCheck === 'function') {
          const result = await provider.healthCheck();
          entries.push({ type: 'tool', id, status: result.status, details: result.details });
        } else {
          entries.push({ type: 'tool', id, status: 'unsupported' });
        }
      } catch (err) {
        entries.push({
          type: 'tool',
          id,
          status: 'error',
          details: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    // LLM providers (no standard healthCheck on ILlmProvider, but check if present)
    for (const [id, provider] of this.llmProviders) {
      const asAny = provider as Record<string, unknown>;
      try {
        if (typeof asAny.healthCheck === 'function') {
          const result = await (asAny.healthCheck as () => Promise<{ status: 'ok' | 'error'; details?: Record<string, unknown> }>)();
          entries.push({ type: 'llm', id, status: result.status, details: result.details });
        } else {
          entries.push({ type: 'llm', id, status: 'unsupported' });
        }
      } catch (err) {
        entries.push({
          type: 'llm',
          id,
          status: 'error',
          details: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    // Messenger services (no standard healthCheck, but check if present)
    for (const [id, service] of this.messengerServices) {
      const asAny = service as Record<string, unknown>;
      try {
        if (typeof asAny.healthCheck === 'function') {
          const result = await (asAny.healthCheck as () => Promise<{ status: 'ok' | 'error'; details?: Record<string, unknown> }>)();
          entries.push({ type: 'messenger', id, status: result.status, details: result.details });
        } else {
          entries.push({ type: 'messenger', id, status: 'unsupported' });
        }
      } catch (err) {
        entries.push({
          type: 'messenger',
          id,
          status: 'error',
          details: { error: err instanceof Error ? err.message : String(err) },
        });
      }
    }

    return entries;
  }

  // -- Hot-reload support ----------------------------------------------------

  /**
   * Re-load a single provider by type and key.
   *
   * Useful for hot-reloading a provider after its configuration changes
   * without restarting the entire application.
   *
   * @param type     Provider category ('llm' | 'memory' | 'tool' | 'messenger').
   * @param id       The profile key or platform name.
   * @param profile  The updated profile (not required for messenger).
   * @throws Error if `type` is unrecognized.
   */
  public async reloadProvider(
    type: 'llm' | 'memory' | 'tool' | 'messenger',
    id: string,
    profile?: ProviderProfile
  ): Promise<void> {
    this.assertInitialized();

    switch (type) {
      case 'llm': {
        const p = profile ?? this._config.llmProfiles?.find((x) => x.key === id);
        if (!p) throw new Error(`No profile found for LLM provider '${id}'`);
        const mod = await loadPlugin(`llm-${p.provider.toLowerCase()}`);
        const instance = instantiateLlmProvider(mod, p.config);
        const existed = this.llmProviders.has(id);
        this.llmProviders.set(id, instance);
        if (!existed) this.llmInsertionOrder.push(id);
        debug('Reloaded LLM provider: %s', id);
        break;
      }
      case 'memory': {
        const p = profile ?? this._config.memoryProfiles?.find((x) => x.key === id);
        if (!p) throw new Error(`No profile found for memory provider '${id}'`);
        const mod = await loadPlugin(`memory-${p.provider.toLowerCase()}`);
        const instance = instantiateMemoryProvider(mod, p.config);
        this.memoryProviders.set(id, instance);
        debug('Reloaded memory provider: %s', id);
        break;
      }
      case 'tool': {
        const p = profile ?? this._config.toolProfiles?.find((x) => x.key === id);
        if (!p) throw new Error(`No profile found for tool provider '${id}'`);
        const mod = await loadPlugin(`tool-${p.provider.toLowerCase()}`);
        const instance = instantiateToolProvider(mod, p.config);
        this.toolProviders.set(id, instance);
        debug('Reloaded tool provider: %s', id);
        break;
      }
      case 'messenger': {
        const mod: PluginModule = await loadPlugin(`message-${id.toLowerCase()}`);
        const instance = instantiateMessageService(mod, profile?.config ?? {});
        this.messengerServices.set(id, instance);
        debug('Reloaded messenger service: %s', id);
        break;
      }
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  // -- Teardown --------------------------------------------------------------

  /**
   * Clear all internal maps and reset the initialized flag.
   *
   * After calling `reset()`, the registry must be `initialize()`-d again
   * before any lookup methods can be used.
   */
  public reset(): void {
    this.llmProviders.clear();
    this.memoryProviders.clear();
    this.toolProviders.clear();
    this.messengerServices.clear();
    this.llmInsertionOrder.length = 0;
    this._initialized = false;
    this._config = {};
    debug('Registry reset');
  }

  // -- Internal helpers ------------------------------------------------------

  /** @throws Error if `initialize()` has not been called. */
  private assertInitialized(): void {
    if (!this._initialized) {
      throw new Error(
        'SyncProviderRegistry has not been initialized. Call initialize() at startup before using lookup methods.'
      );
    }
  }
}

/** Convenience default export of the singleton instance. */
export const syncProviderRegistry = SyncProviderRegistry.getInstance();
