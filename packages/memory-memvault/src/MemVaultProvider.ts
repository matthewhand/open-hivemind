import { randomUUID } from 'crypto';
import Debug from 'debug';
import type {
  IMemoryProvider,
  IServiceDependencies,
  MemoryEntry,
  MemoryScopeOptions,
  MemorySearchResult,
} from '@hivemind/shared-types';
import { DatabaseMemVaultStore, isMemVaultDurableBackend } from './DatabaseMemVaultStore';
import { InMemoryMemVaultStore } from './InMemoryMemVaultStore';
import { cosineSimilarity, hybridScore } from './scoring';
import type { MemVaultConfig, MemVaultStore, StoredMemory } from './types';

const debug = Debug('hivemind:memory-memvault');

const DEFAULT_LIMIT = 10;

/**
 * MemVault — a native, in-process RAG memory backend.
 *
 * Ranks memories with a hybrid score that blends embedding (vector) similarity
 * with an exponential recency-decay term, per the documented design:
 *
 *     score = (similarity × vectorWeight) + (recencyDecay × recencyWeight)
 *
 * Embeddings are produced by an injected LLM provider that exposes
 * `generateEmbedding()` (resolved from {@link IServiceDependencies}). Storage
 * is delegated to a pluggable {@link MemVaultStore}; the default is a
 * dependency-free in-process store, so the provider works without any external
 * Postgres/pgvector infrastructure.
 */
export class MemVaultProvider implements IMemoryProvider {
  readonly id = 'memvault';
  readonly label = 'MemVault (Hybrid RAG)';
  readonly type = 'memory' as const;

  private readonly store: MemVaultStore;
  private readonly vectorWeight: number;
  private readonly recencyWeight: number;
  private readonly recencyHalfLifeMs?: number;
  private readonly defaultLimit: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private embeddingProvider: any;

  constructor(
    private readonly config: MemVaultConfig = {},
    private readonly dependencies?: IServiceDependencies,
    store?: MemVaultStore
  ) {
    this.store = store ?? new InMemoryMemVaultStore();
    this.vectorWeight = config.vectorWeight ?? 0.8;
    this.recencyWeight = config.recencyWeight ?? 0.2;
    this.recencyHalfLifeMs = config.recencyHalfLifeMs;
    this.defaultLimit = config.defaultLimit ?? DEFAULT_LIMIT;

    this.resolveEmbeddingProvider();

    debug(
      'MemVaultProvider initialised (vectorWeight=%d, recencyWeight=%d, store=%s)',
      this.vectorWeight,
      this.recencyWeight,
      this.store.constructor.name
    );
  }

  private resolveEmbeddingProvider(): void {
    if (this.embeddingProvider || !this.dependencies?.getLlmProviders) {
      return;
    }
    const providers = this.dependencies.getLlmProviders();
    if (this.config.embeddingProfile) {
      this.embeddingProvider = providers.find((p) => p.name === this.config.embeddingProfile);
    }
    if (!this.embeddingProvider) {
      this.embeddingProvider = providers.find((p) => typeof p.generateEmbedding === 'function');
    }
  }

  private async embed(text: string): Promise<number[]> {
    this.resolveEmbeddingProvider();
    if (!this.embeddingProvider || typeof this.embeddingProvider.generateEmbedding !== 'function') {
      throw new Error('MemVaultProvider: embedding provider not available');
    }
    const embedding = await this.embeddingProvider.generateEmbedding(text);
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('MemVaultProvider: embedding provider returned an empty vector');
    }
    return embedding;
  }

  async addMemory(
    content: string,
    metadata?: Record<string, unknown>,
    options?: MemoryScopeOptions
  ): Promise<MemoryEntry> {
    const embedding = await this.embed(content);
    const record: StoredMemory = {
      id: randomUUID(),
      content,
      embedding,
      timestamp: Date.now(),
      ...(metadata ? { metadata } : {}),
      ...(options?.userId ? { userId: options.userId } : {}),
      ...(options?.agentId ? { agentId: options.agentId } : {}),
    };
    await this.store.put(record);
    return toEntry(record);
  }

  async searchMemories(
    query: string,
    options?: { limit?: number; threshold?: number } & MemoryScopeOptions
  ): Promise<MemorySearchResult> {
    const queryEmbedding = await this.embed(query);
    const candidates = await this.store.list({
      userId: options?.userId,
      agentId: options?.agentId,
    });

    const now = Date.now();
    const scored = candidates.map((record) => {
      const similarity = safeSimilarity(queryEmbedding, record.embedding);
      const score = hybridScore(similarity, record.timestamp, {
        vectorWeight: this.vectorWeight,
        recencyWeight: this.recencyWeight,
        halfLifeMs: this.recencyHalfLifeMs,
        now,
      });
      return { entry: toEntry(record, score) };
    });

    scored.sort((a, b) => (b.entry.score ?? 0) - (a.entry.score ?? 0));

    const limit = options?.limit ?? this.defaultLimit;
    const threshold = options?.threshold;
    const results = scored
      .filter((s) => threshold == null || (s.entry.score ?? 0) >= threshold)
      .slice(0, limit)
      .map((s) => s.entry);

    return { results };
  }

  async getMemories(options?: { limit?: number } & MemoryScopeOptions): Promise<MemoryEntry[]> {
    const records = await this.store.list({
      userId: options?.userId,
      agentId: options?.agentId,
    });
    // Most-recent-first ordering for listing.
    records.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    const limited = options?.limit != null ? records.slice(0, options.limit) : records;
    return limited.map((r) => toEntry(r));
  }

  async getMemory(id: string): Promise<MemoryEntry | null> {
    const found = await this.store.get(id);
    return found ? toEntry(found) : null;
  }

  async updateMemory(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    const existing = await this.store.get(id);
    if (!existing) {
      throw new Error(`MemVaultProvider: memory not found: ${id}`);
    }
    const embedding = await this.embed(content);
    const updated: StoredMemory = {
      ...existing,
      content,
      embedding,
      timestamp: Date.now(),
      ...(metadata !== undefined ? { metadata } : {}),
    };
    await this.store.put(updated);
    return toEntry(updated);
  }

  async deleteMemory(id: string): Promise<void> {
    await this.store.delete(id);
  }

  async deleteAll(options?: MemoryScopeOptions): Promise<void> {
    await this.store.clear({
      userId: options?.userId,
      agentId: options?.agentId,
    });
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; details?: Record<string, unknown> }> {
    try {
      const ready = this.store.isReady();
      this.resolveEmbeddingProvider();
      const hasEmbedding =
        !!this.embeddingProvider && typeof this.embeddingProvider.generateEmbedding === 'function';
      if (ready && hasEmbedding) {
        return { status: 'ok', details: { store: this.store.constructor.name } };
      }
      return {
        status: 'error',
        details: {
          storeReady: ready,
          embeddingProviderAvailable: hasEmbedding,
        },
      };
    } catch (err) {
      return {
        status: 'error',
        details: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  }
}

/** Cosine similarity that tolerates dimension mismatches by returning 0. */
function safeSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }
  return cosineSimilarity(a, b);
}

/** Project a StoredMemory down to the public MemoryEntry shape. */
function toEntry(record: StoredMemory, score?: number): MemoryEntry {
  const entry: MemoryEntry = {
    id: record.id,
    content: record.content,
  };
  if (score !== undefined) entry.score = score;
  if (record.metadata !== undefined) entry.metadata = record.metadata;
  if (record.timestamp !== undefined) entry.timestamp = record.timestamp;
  if (record.userId !== undefined) entry.userId = record.userId;
  if (record.agentId !== undefined) entry.agentId = record.agentId;
  return entry;
}

/**
 * Plugin factory — PluginLoader-compatible entry point.
 *
 * When the host injects a database manager (via
 * `dependencies.getDatabaseManager()`) that exposes the MemVault durable
 * backend surface, memories are persisted through it (with an in-memory
 * cache on top) so they survive restarts. Set `config.durable = false` to
 * opt out. Without a usable backend the provider falls back to the
 * non-durable in-process store.
 */
export function create(
  config: MemVaultConfig = {},
  dependencies?: IServiceDependencies
): MemVaultProvider {
  let store: MemVaultStore | undefined;
  if (config.durable !== false && dependencies?.getDatabaseManager) {
    try {
      const backend = dependencies.getDatabaseManager();
      if (isMemVaultDurableBackend(backend)) {
        store = new DatabaseMemVaultStore(backend, (operation, err) =>
          debug('Durable store %s failed (continuing from cache): %O', operation, err)
        );
        debug('MemVault using database-backed durable store');
      } else {
        debug('Injected database manager lacks MemVault backend surface; using in-memory store');
      }
    } catch (err) {
      debug('Failed to resolve database manager; using in-memory store: %O', err);
    }
  }
  return new MemVaultProvider(config, dependencies, store);
}

export const manifest = {
  displayName: 'MemVault',
  description:
    'Native in-process RAG memory with hybrid scoring (vector similarity + recency decay)',
  type: 'memory',
};
