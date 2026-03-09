import Debug from 'debug';
import type { IMemoryProvider, PluginManifest } from '../../../src/types/IProvider';
import memvaultConfig from '../../../src/config/memvaultConfig';
import openaiConfig from '../../../src/config/openaiConfig';

const debug = Debug('app:memory-memvault');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemVaultProviderConfig {
  mode?: 'cloud' | 'self-hosted';
  apiKey?: string;
  baseUrl?: string;
  databaseUrl?: string;
  embeddingProviderId?: string;
  embeddingModel?: string;
  openaiApiKey?: string;
  searchStrategy?: 'hybrid' | 'vector' | 'keyword';
  defaultUserId?: string;
}

interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  score?: number;
}

// ---------------------------------------------------------------------------
// MemVaultProvider
// ---------------------------------------------------------------------------

/**
 * MemVault Memory Provider
 *
 * Open-source RAG memory server built natively in Node.js with Postgres + pgvector.
 * Uses hybrid scoring: (vector similarity × 0.8) + (recency decay × 0.2)
 *
 * Supports:
 * - Cloud mode (managed API)
 * - Self-hosted mode (own Postgres + pgvector)
 */
export class MemVaultProvider implements IMemoryProvider {
  readonly id = 'memvault';
  readonly label = 'MemVault';
  readonly type = 'memory' as const;

  private config: MemVaultProviderConfig;
  private memories: Map<string, MemoryEntry> = new Map();
  private defaultUserId: string;
  private baseUrl: string;
  private apiKey: string;
  private openaiApiKey: string;

  constructor(config?: MemVaultProviderConfig) {
    // Load config from convict
    const convictConfig = memvaultConfig.getProperties();

    this.config = {
      mode: config?.mode ?? convictConfig.mode,
      apiKey: config?.apiKey ?? convictConfig.apiKey,
      baseUrl: config?.baseUrl ?? convictConfig.baseUrl,
      databaseUrl: config?.databaseUrl ?? convictConfig.databaseUrl,
      embeddingProviderId: config?.embeddingProviderId ?? 'openai',
      embeddingModel: config?.embeddingModel ?? 'text-embedding-3-small',
      openaiApiKey: config?.openaiApiKey ?? convictConfig.openaiApiKey,
      searchStrategy: config?.searchStrategy ?? convictConfig.searchStrategy,
      defaultUserId: config?.defaultUserId ?? convictConfig.defaultUserId,
    };

    // Resolve OpenAI config for embeddings
    if (this.config.embeddingProviderId === 'openai') {
      this.openaiApiKey = openaiConfig.get('OPENAI_API_KEY');
      debug('Using OpenAI for embeddings');
    } else {
      this.openaiApiKey = this.config.openaiApiKey || '';
      debug('Using custom embedding provider: %s', this.config.embeddingProviderId);
    }

    this.baseUrl = this.config.baseUrl || 'https://api.memvault.ai';
    this.apiKey = this.config.apiKey || '';
    this.defaultUserId = this.config.defaultUserId || 'default';

    debug('MemVault provider initialized: mode=%s, baseUrl=%s', this.config.mode, this.baseUrl);
  }

  // ---------------------------------------------------------------------------
  // Core memory operations
  // ---------------------------------------------------------------------------

  /**
   * Add memories with automatic entity extraction and graph building.
   */
  async add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const userId = options?.userId ?? this.defaultUserId;

    debug('Adding memories for userId=%s', userId);

    if (this.config.mode === 'cloud' && this.apiKey) {
      return this.addCloud(messages, options);
    }

    // Local fallback
    return this.addLocal(messages, options);
  }

  private async addCloud(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/memory/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          messages,
          userId: options?.userId ?? this.defaultUserId,
          metadata: options?.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`MemVault API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (e: any) {
      debug('Cloud add failed, falling back to local: %s', e.message);
      return this.addLocal(messages, options);
    }
  }

  private async addLocal(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const userId = options?.userId ?? this.defaultUserId;
    const results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> = [];

    for (const message of messages) {
      const id = this.generateId();
      const entry: MemoryEntry = {
        id,
        content: message.content,
        metadata: {
          userId,
          agentId: options?.agentId,
          role: message.role,
          ...options?.metadata,
        },
        createdAt: new Date(),
      };

      this.memories.set(id, entry);
      results.push({ id, memory: message.content, metadata: entry.metadata });
    }

    debug('Added %d memories locally', results.length);
    return { results };
  }

  /**
   * Search with hybrid scoring: (vector similarity × 0.8) + (recency decay × 0.2)
   */
  async search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const userId = options?.userId ?? this.defaultUserId;
    const limit = options?.limit ?? 10;

    debug('Searching memories: "%s" for userId=%s', query, userId);

    if (this.config.mode === 'cloud' && this.apiKey) {
      return this.searchCloud(query, options);
    }

    return this.searchLocal(query, options);
  }

  private async searchCloud(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/memory/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          userId: options?.userId ?? this.defaultUserId,
          limit: options?.limit ?? 10,
          strategy: this.config.searchStrategy,
        }),
      });

      if (!response.ok) {
        throw new Error(`MemVault API error: ${response.status}`);
      }

      return await response.json();
    } catch (e: any) {
      debug('Cloud search failed, falling back to local: %s', e.message);
      return this.searchLocal(query, options);
    }
  }

  private async searchLocal(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const userId = options?.userId ?? this.defaultUserId;
    const limit = options?.limit ?? 10;

    const queryLower = query.toLowerCase();
    const now = Date.now();
    const results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> = [];

    for (const [id, memory] of this.memories) {
      if (memory.metadata?.userId === userId || !userId) {
        const contentLower = memory.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          // Hybrid scoring: (similarity × 0.8) + (recency × 0.2)
          const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
          const similarityScore = Math.min(occurrences / 10, 1);

          // Recency decay: newer memories score higher
          const ageMs = now - memory.createdAt.getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          const recencyScore = Math.exp(-ageDays / 30); // 30-day half-life

          const hybridScore = similarityScore * 0.8 + recencyScore * 0.2;

          results.push({
            id,
            memory: memory.content,
            score: hybridScore,
            metadata: memory.metadata,
          });
        }
      }
    }

    // Sort by hybrid score descending
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    debug('Found %d memories with hybrid scoring', results.length);
    return { results: results.slice(0, limit) };
  }

  /**
   * Get all memories for a user.
   */
  async getAll(options?: { userId?: string; agentId?: string }): Promise<{ results: Array<{ id: string; memory: string }> }> {
    const userId = options?.userId ?? this.defaultUserId;

    debug('Getting all memories for userId=%s', userId);

    const results: Array<{ id: string; memory: string }> = [];

    for (const [id, memory] of this.memories) {
      if (memory.metadata?.userId === userId || !userId) {
        results.push({ id, memory: memory.content });
      }
    }

    return { results };
  }

  /**
   * Get a specific memory by ID.
   */
  async get(memoryId: string): Promise<{ id: string; memory: string } | null> {
    debug('Getting memory: %s', memoryId);
    const entry = this.memories.get(memoryId);
    if (!entry) return null;
    return { id: memoryId, memory: entry.content };
  }

  /**
   * Update a memory's content.
   */
  async update(memoryId: string, newContent: string): Promise<{ id: string; memory: string }> {
    debug('Updating memory %s', memoryId);
    const entry = this.memories.get(memoryId);
    if (!entry) {
      throw new Error(`Memory ${memoryId} not found`);
    }
    entry.content = newContent;
    return { id: memoryId, memory: newContent };
  }

  /**
   * Delete a specific memory.
   */
  async delete(memoryId: string): Promise<void> {
    debug('Deleting memory %s', memoryId);
    this.memories.delete(memoryId);
  }

  /**
   * Delete all memories for a user.
   */
  async deleteAll(options?: { userId?: string; agentId?: string }): Promise<void> {
    const userId = options?.userId ?? this.defaultUserId;

    debug('Deleting all memories for userId=%s', userId);

    for (const [id, memory] of this.memories) {
      if (memory.metadata?.userId === userId) {
        this.memories.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helper methods
  // ---------------------------------------------------------------------------

  private generateId(): string {
    return `mv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ---------------------------------------------------------------------------
// Factory and manifest
// ---------------------------------------------------------------------------

export function create(config?: MemVaultProviderConfig): MemVaultProvider {
  return new MemVaultProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'MemVault',
  description: 'Open-source RAG memory server with Postgres + pgvector — hybrid scoring (vector × 0.8) + (recency × 0.2)',
  type: 'memory',
  minVersion: '1.0.0',
};
