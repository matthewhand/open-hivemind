import Debug from 'debug';
import type { IMemoryProvider } from '@src/types/IProvider';
import { getMemoryProfileByKey } from '@src/config/memoryProfiles';
import { BotConfigurationManager } from '@src/config/BotConfigurationManager';
import { loadPlugin, instantiateMemoryProvider } from '@src/plugins';

const debug = Debug('app:MemoryManager');

/**
 * Result from a memory search operation.
 */
export interface MemorySearchResult {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Metadata attached to stored conversation memories.
 */
export interface ConversationMemoryMetadata {
  botName: string;
  channelId?: string;
  userId?: string;
  timestamp: string;
  [key: string]: unknown;
}

/** Default number of memories to retrieve for prompt context. */
const DEFAULT_MEMORY_LIMIT = 5;

/**
 * Singleton service that manages memory operations for bots.
 *
 * Resolves each bot's memory profile to a concrete IMemoryProvider, caches
 * provider instances, and exposes helpers for storing and retrieving
 * conversation memory within the message-handling pipeline.
 */
export class MemoryManager {
  private static instance: MemoryManager;

  /** Cache of instantiated memory providers keyed by memory profile key. */
  private providers = new Map<string, IMemoryProvider>();

  /** Profiles that failed to load — avoid repeated noisy retries. */
  private failedProfiles = new Set<string>();

  private constructor() {}

  /**
   * Returns the singleton MemoryManager instance.
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // ---------------------------------------------------------------------------
  // Provider resolution
  // ---------------------------------------------------------------------------

  /**
   * Look up the memory provider for a given bot.
   *
   * Resolution path:
   *   botConfig.memoryProfile → memory-profiles.json → plugin loader → IMemoryProvider
   *
   * Returns `null` when the bot has no memory profile configured or the
   * profile / plugin cannot be resolved.
   */
  public getProviderForBot(botName: string): IMemoryProvider | null {
    try {
      const botConfig = BotConfigurationManager.getInstance().getBot(botName);
      if (!botConfig) {
        debug('No bot config found for "%s"', botName);
        return null;
      }

      const profileKey = (botConfig as Record<string, unknown>).memoryProfile as
        | string
        | undefined;
      if (!profileKey) {
        return null; // Memory not configured — this is the normal path for most bots.
      }

      return this.resolveProvider(profileKey);
    } catch (err) {
      debug('Error resolving memory provider for bot "%s": %O', botName, err);
      return null;
    }
  }

  /**
   * Resolve (and cache) a memory provider from a profile key.
   */
  private resolveProvider(profileKey: string): IMemoryProvider | null {
    // Return cached provider.
    if (this.providers.has(profileKey)) {
      return this.providers.get(profileKey)!;
    }

    // Skip profiles that already failed.
    if (this.failedProfiles.has(profileKey)) {
      return null;
    }

    const profile = getMemoryProfileByKey(profileKey);
    if (!profile) {
      debug('Memory profile "%s" not found in memory-profiles.json', profileKey);
      this.failedProfiles.add(profileKey);
      return null;
    }

    try {
      const pluginName = `memory-${profile.provider}`;
      const mod = loadPlugin(pluginName);
      const provider = instantiateMemoryProvider(mod, profile.config) as IMemoryProvider;
      this.providers.set(profileKey, provider);
      debug('Instantiated memory provider for profile "%s" (plugin: %s)', profileKey, pluginName);
      return provider;
    } catch (err) {
      debug(
        'Failed to instantiate memory provider for profile "%s": %O',
        profileKey,
        err,
      );
      this.failedProfiles.add(profileKey);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------

  /**
   * Persist a single conversation message into the bot's memory provider.
   */
  public async storeConversationMemory(
    botName: string,
    message: string,
    role: 'user' | 'assistant',
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const provider = this.getProviderForBot(botName);
    if (!provider) {
      return;
    }

    const memMeta: ConversationMemoryMetadata = {
      botName,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    try {
      await provider.add([{ role, content: message }], {
        agentId: botName,
        userId: (metadata?.userId as string) ?? undefined,
        metadata: memMeta,
      });
      debug('Stored %s memory for bot "%s"', role, botName);
    } catch (err) {
      // Memory storage should never break the message pipeline.
      debug('Failed to store memory for bot "%s": %O', botName, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Retrieve
  // ---------------------------------------------------------------------------

  /**
   * Search the bot's memory provider for memories relevant to `query`.
   *
   * @returns An array of memory strings, or an empty array when memory is
   *          unavailable.
   */
  public async retrieveRelevantMemories(
    botName: string,
    query: string,
    limit: number = DEFAULT_MEMORY_LIMIT,
  ): Promise<MemorySearchResult[]> {
    const provider = this.getProviderForBot(botName);
    if (!provider) {
      return [];
    }

    try {
      const response = await provider.search(query, {
        agentId: botName,
        limit,
      });
      return (response.results ?? []).map((r) => ({
        id: r.id,
        memory: r.memory,
        score: r.score,
        metadata: r.metadata,
      }));
    } catch (err) {
      debug('Failed to retrieve memories for bot "%s": %O', botName, err);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  /**
   * Format retrieved memories into a block suitable for injection into an LLM
   * system prompt.
   *
   * Returns an empty string when there are no memories so callers can
   * trivially check truthiness.
   */
  public formatMemoriesForPrompt(memories: MemorySearchResult[]): string {
    if (!memories || memories.length === 0) {
      return '';
    }

    const lines = memories.map((m) => `- ${m.memory}`);
    return (
      'Relevant memories from previous conversations:\n' + lines.join('\n')
    );
  }

  // ---------------------------------------------------------------------------
  // Housekeeping
  // ---------------------------------------------------------------------------

  /**
   * Clear the cached provider for a profile (e.g. after config changes).
   */
  public clearProviderCache(profileKey?: string): void {
    if (profileKey) {
      this.providers.delete(profileKey);
      this.failedProfiles.delete(profileKey);
    } else {
      this.providers.clear();
      this.failedProfiles.clear();
    }
  }
}
