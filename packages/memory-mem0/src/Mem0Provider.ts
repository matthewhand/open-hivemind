import Debug from 'debug';
import { Memory } from 'mem0ai/oss';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

const debug = Debug('app:memory-mem0');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
  userId?: string;
  agentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemorySearchResult {
  results: MemoryEntry[];
}

export interface Mem0Config {
  /** API key for OpenAI (required for embeddings/LLM) */
  apiKey?: string;
  /** LLM provider: 'openai' | 'anthropic' */
  llmProvider?: 'openai' | 'anthropic';
  /** LLM model to use */
  llmModel?: string;
  /** Embedder model */
  embedderModel?: string;
  /** Vector store provider: 'memory' (in-memory), 'pgvector', or 'pinecone' */
  vectorStoreProvider?: 'memory' | 'pgvector' | 'pinecone';
  /** History database path */
  historyDbPath?: string;
  /** Custom LLM base URL */
  llmBaseUrl?: string;
  /** User ID scope for memories */
  userId?: string;
  /** Agent ID scope for memories */
  agentId?: string;
  /** Custom embedder base URL (for OpenAI-compatible endpoints) */
  embedderBaseUrl?: string;
  /** Reference to LLM provider for embeddings (resolved by caller) */
  embeddingProviderId?: string;
  /** LLM profile key for embeddings (resolved by caller) */
  llmProfileKey?: string;
  // --- pgvector configuration ---
  /** PostgreSQL host for pgvector */
  pgvectorHost?: string;
  /** PostgreSQL port for pgvector */
  pgvectorPort?: number;
  /** PostgreSQL user for pgvector */
  pgvectorUser?: string;
  /** PostgreSQL password for pgvector */
  pgvectorPassword?: string;
  /** PostgreSQL database name for pgvector */
  pgvectorDatabase?: string;
  /** Collection name for pgvector */
  pgvectorCollection?: string;
  /** Embedding dimensions for pgvector */
  embeddingModelDims?: number;
  /** Disable SQLite history tracking */
  disableHistory?: boolean;
}

// ---------------------------------------------------------------------------
// Mem0Provider
// ---------------------------------------------------------------------------

export class Mem0Provider {
  readonly id = 'mem0';
  readonly label = 'Mem0';
  readonly type = 'memory' as const;

  private memory: Memory;
  private defaultUserId?: string;
  private defaultAgentId?: string;

  constructor(config?: Mem0Config) {
    debug('Initializing Mem0Provider with config: %O', config);

    this.defaultUserId = config?.userId;
    this.defaultAgentId = config?.agentId;

    // Build Mem0 configuration
    const mem0Config: any = {};

    if (config?.apiKey) {
      mem0Config.llm = {
        provider: config.llmProvider ?? 'openai',
        config: {
          apiKey: config.apiKey,
          model: config.llmModel ?? 'gpt-4o-mini',
          ...(config.llmBaseUrl ? { openaiBaseUrl: config.llmBaseUrl } : {}),
        },
      };

      mem0Config.embedder = {
        provider: 'openai',
        config: {
          apiKey: config.apiKey,
          model: config.embedderModel ?? 'text-embedding-3-small',
        },
      };
    }

    if (config?.vectorStoreProvider) {
      if (config.vectorStoreProvider === 'pgvector') {
        // pgvector configuration
        mem0Config.vectorStore = {
          provider: 'pgvector',
          config: {
            collectionName: config.pgvectorCollection ?? 'mem0_memories',
            embeddingModelDims: config.embeddingModelDims ?? 1536,
            user: config.pgvectorUser ?? 'hivemind',
            password: config.pgvectorPassword,
            host: config.pgvectorHost ?? 'localhost',
            port: config.pgvectorPort ?? 5432,
            dbname: config.pgvectorDatabase ?? 'hivemind',
          },
        };
      } else {
        // Other vector stores (memory, pinecone)
        mem0Config.vectorStore = {
          provider: config.vectorStoreProvider,
          config: {
            collectionName: 'hivemind-memories',
            dimension: 1536,
          },
        };
      }
    }

    if (config?.historyDbPath) {
      mem0Config.historyDbPath = config.historyDbPath;
    }
    if (config?.disableHistory !== undefined) {
      mem0Config.disableHistory = config.disableHistory;
    }

    this.memory = new Memory(mem0Config);
    debug('Mem0 Memory instance created');
  }

  // ---------------------------------------------------------------------------
  // Core memory operations
  // ---------------------------------------------------------------------------

  /**
   * Add memories from conversation messages.
   * Mem0 extracts facts and stores them automatically.
   */
  async add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<MemorySearchResult> {
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;

    debug('Adding memories for userId=%s, agentId=%s', userId, agentId);

    const result = await this.memory.add(messages, {
      userId,
      agentId,
      metadata: options?.metadata,
    });

    return result as MemorySearchResult;
  }

  /**
   * Search memories by natural language query.
   */
  async search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<MemorySearchResult> {
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;

    debug('Searching memories: "%s" for userId=%s', query, userId);

    const result = await this.memory.search(query, {
      userId,
      agentId,
      limit: options?.limit ?? 10,
    });

    return result as MemorySearchResult;
  }

  /**
   * Get all memories for a user/agent.
   */
  async getAll(options?: { userId?: string; agentId?: string }): Promise<MemorySearchResult> {
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;

    debug('Getting all memories for userId=%s', userId);

    const result = await this.memory.getAll({ userId, agentId });
    return result as MemorySearchResult;
  }

  /**
   * Get a specific memory by ID.
   */
  async get(memoryId: string): Promise<MemoryEntry | null> {
    debug('Getting memory: %s', memoryId);
    try {
      const result = await this.memory.get(memoryId);
      return result as MemoryEntry;
    } catch (e: any) {
      debug('Failed to get memory %s: %s', memoryId, e.message);
      return null;
    }
  }

  /**
   * Update a memory's content.
   */
  async update(memoryId: string, newContent: string): Promise<MemoryEntry> {
    debug('Updating memory %s', memoryId);
    const result = await this.memory.update(memoryId, newContent);
    return result as unknown as MemoryEntry;
  }

  /**
   * Delete a specific memory.
   */
  async delete(memoryId: string): Promise<void> {
    debug('Deleting memory %s', memoryId);
    await this.memory.delete(memoryId);
  }

  /**
   * Delete all memories for a user/agent.
   */
  async deleteAll(options?: { userId?: string; agentId?: string }): Promise<void> {
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;

    debug('Deleting all memories for userId=%s', userId);
    await this.memory.deleteAll({ userId, agentId });
  }

  /**
   * Get change history for a memory.
   */
  async history(memoryId: string): Promise<MemoryEntry[]> {
    debug('Getting history for memory %s', memoryId);
    const result = await this.memory.history(memoryId);
    return result as MemoryEntry[];
  }

  /**
   * Reset all memories (dangerous!).
   */
  async reset(): Promise<void> {
    debug('Resetting all memories');
    await this.memory.reset();
  }
}

// ---------------------------------------------------------------------------
// Factory and manifest
// ---------------------------------------------------------------------------

export function create(config?: Mem0Config): Mem0Provider {
  return new Mem0Provider(config);
}

export const manifest: PluginManifest = {
  displayName: 'Mem0',
  description: 'Persistent memory for AI agents via Mem0 — stores facts, preferences, and context',
  type: 'memory',
  minVersion: '1.0.0',
};
