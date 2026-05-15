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
      const providers = dependencies.getLlmProviders();
      // Use configured profile or fallback to first one that can embed
      if (this.config.embeddingProfile) {
        this.embeddingProvider = providers.find((p) => p.name === this.config.embeddingProfile);
      }
      if (!this.embeddingProvider) {
        this.embeddingProvider = providers.find((p) => typeof p.generateEmbedding === 'function');
      }
    }
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
      const providers = this.dependencies.getLlmProviders();
      this.embeddingProvider = providers.find((p) => typeof p.generateEmbedding === 'function');
    }
    if (!this.embeddingProvider) {
      throw new Error('PostgresMemoryProvider: Embedding provider not available');
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
    // Implementation for getting single memory from dbManager
    // For now we use getMemories and find
    const memories = await this.dbManager.getMemories({ limit: 1000 });
    const found = memories.find((m: any) => String(m.id) === id);
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
    throw new Error('Update memory not implemented in PostgresMemoryProvider');
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
