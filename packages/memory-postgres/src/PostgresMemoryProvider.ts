import Debug from 'debug';
import {
  IMemoryProvider,
  IServiceDependencies,
  MemoryEntry,
  MemoryScopeOptions,
  MemorySearchResult,
} from '@hivemind/shared-types';

const debug = Debug('hivemind:memory-postgres');

export interface PostgresMemoryConfig {
  embeddingProfile?: string;
}

export class PostgresMemoryProvider implements IMemoryProvider {
  readonly id = 'postgres';
  readonly label = 'Postgres (Native Vector)';
  readonly type = 'memory' as const;

  private dbManager: any;
  private embeddingProvider: any;

  constructor(
    private config: PostgresMemoryConfig,
    private dependencies?: IServiceDependencies
  ) {
    if (dependencies?.getDatabaseManager) {
      this.dbManager = dependencies.getDatabaseManager();
    }

    // Resolve embedding provider
    if (dependencies?.getLlmProviders) {
      this.embeddingProvider = this.resolveEmbeddingProvider(dependencies.getLlmProviders());
    }
  }

  /**
   * Resolves an embedding-capable LLM provider.
   *
   * When `embeddingProfile` is configured, the named provider must exist AND
   * implement `generateEmbedding` — otherwise a clear error is thrown rather
   * than silently falling back to a different provider. When no profile is
   * configured, the first provider that supports embeddings is used.
   */
  private resolveEmbeddingProvider(providers: any[]): any {
    if (this.config.embeddingProfile) {
      const named = providers.find((p) => p.name === this.config.embeddingProfile);
      if (!named) {
        throw new Error(
          `PostgresMemoryProvider: Configured embedding profile "${this.config.embeddingProfile}" was not found among LLM providers`
        );
      }
      if (typeof named.generateEmbedding !== 'function') {
        throw new Error(
          `PostgresMemoryProvider: Configured embedding profile "${this.config.embeddingProfile}" does not support embeddings (no generateEmbedding). Use a provider such as OpenAI or OpenWebUI/Ollama.`
        );
      }
      return named;
    }
    return providers.find((p) => typeof p.generateEmbedding === 'function');
  }

  private ensureInitialized() {
    if (!this.dbManager) {
      if (this.dependencies?.getDatabaseManager) {
        this.dbManager = this.dependencies.getDatabaseManager();
      }
    }
    if (!this.dbManager) {
      throw new Error('PostgresMemoryProvider: DatabaseManager not available');
    }
    if (!this.embeddingProvider && this.dependencies?.getLlmProviders) {
      this.embeddingProvider = this.resolveEmbeddingProvider(this.dependencies.getLlmProviders());
    }
    if (!this.embeddingProvider) {
      throw new Error(
        'PostgresMemoryProvider: No embedding-capable LLM provider available. Configure a provider that implements generateEmbedding (e.g. OpenAI or OpenWebUI/Ollama).'
      );
    }
  }

  async addMemory(
    content: string,
    metadata?: Record<string, unknown>,
    options?: MemoryScopeOptions
  ): Promise<MemoryEntry> {
    this.ensureInitialized();

    const embedding = await this.embeddingProvider.generateEmbedding(content);

    const id = await this.dbManager.addMemory({
      content,
      metadata,
      userId: options?.userId,
      agentId: options?.agentId,
      sessionId: options?.sessionId,
      embedding,
    });

    return {
      id: String(id),
      content,
      metadata,
      userId: options?.userId,
      agentId: options?.agentId,
      timestamp: Date.now(),
    };
  }

  async searchMemories(
    query: string,
    options?: { limit?: number; threshold?: number } & MemoryScopeOptions
  ): Promise<MemorySearchResult> {
    this.ensureInitialized();

    const embedding = await this.embeddingProvider.generateEmbedding(query);
    const results = await this.dbManager.searchMemories(embedding, {
      limit: options?.limit,
      userId: options?.userId,
      agentId: options?.agentId,
    });

    const entries = results
      .map((r: any) => ({
        id: String(r.id),
        content: r.content,
        score: r.score,
        metadata: r.metadata,
        userId: r.userId,
        agentId: r.agentId,
        timestamp: r.createdAt ? new Date(r.createdAt).getTime() : undefined,
      }))
      .filter((e: any) => options?.threshold == null || e.score >= options.threshold);

    return { results: entries };
  }

  async getMemories(options?: { limit?: number } & MemoryScopeOptions): Promise<MemoryEntry[]> {
    this.ensureInitialized();
    const results = await this.dbManager.getMemories({
      limit: options?.limit,
      userId: options?.userId,
      agentId: options?.agentId,
    });

    return results.map((r: any) => ({
      id: String(r.id),
      content: r.content,
      metadata: r.metadata,
      userId: r.userId,
      agentId: r.agentId,
      timestamp: r.createdAt ? new Date(r.createdAt).getTime() : undefined,
    }));
  }

  async getMemory(id: string): Promise<MemoryEntry | null> {
    this.ensureInitialized();
    // Direct indexed lookup (SELECT ... WHERE id = $1) — O(1) on the primary
    // key, instead of fetching up to 1000 rows and scanning them in JS.
    const found = await this.dbManager.getMemoryById(id);
    if (!found) return null;

    return {
      id: String(found.id),
      content: found.content,
      metadata: found.metadata,
      userId: found.userId,
      agentId: found.agentId,
      timestamp: found.createdAt ? new Date(found.createdAt).getTime() : undefined,
    };
  }

  async updateMemory(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    this.ensureInitialized();

    // Re-embed the new content so semantic search stays consistent with the
    // updated text, then update the row in place (preserving id / created_at).
    const embedding = await this.embeddingProvider.generateEmbedding(content);
    const updated = await this.dbManager.updateMemory(id, { content, metadata, embedding });
    if (!updated) {
      throw new Error(`PostgresMemoryProvider: memory ${id} not found`);
    }

    const row = await this.dbManager.getMemoryById(id);
    return {
      id: String(id),
      content: row?.content ?? content,
      metadata: row?.metadata ?? metadata,
      userId: row?.userId,
      agentId: row?.agentId,
      timestamp: row?.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
    };
  }

  async deleteMemory(id: string): Promise<void> {
    this.ensureInitialized();
    await this.dbManager.deleteMemory(id);
  }

  async deleteAll(options?: MemoryScopeOptions): Promise<void> {
    this.ensureInitialized();
    await this.dbManager.deleteAllMemories({
      userId: options?.userId,
      agentId: options?.agentId,
    });
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; details?: Record<string, unknown> }> {
    try {
      this.ensureInitialized();
      const connected = this.dbManager.isConnected();
      return { status: connected ? 'ok' : 'error' };
    } catch (err) {
      return {
        status: 'error',
        details: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  }
}

/**
 * Plugin factory
 */
export function create(config: PostgresMemoryConfig, dependencies: IServiceDependencies) {
  return new PostgresMemoryProvider(config, dependencies);
}

export const manifest = {
  displayName: 'Postgres Vector',
  description: 'Native Postgres vector memory storage using pgvector',
  type: 'memory',
};
