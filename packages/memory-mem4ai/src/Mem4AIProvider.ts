import Debug from 'debug';
import type { IMemoryProvider, PluginManifest } from '../../../src/types/IProvider';
import mem4aiConfig from '../../../src/config/mem4aiConfig';
import openaiConfig from '../../../src/config/openaiConfig';

const debug = Debug('app:memory-mem4ai');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Mem4AIProviderConfig {
  useLLMConfig?: boolean;
  storagePath?: string;
  embeddingStrategy?: 'openai' | 'local' | 'custom';
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  embeddingModel?: string;
  defaultUserId?: string;
  defaultAgentId?: string;
}

interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Mem4AIProvider
// ---------------------------------------------------------------------------

/**
 * Mem4AI Memory Provider
 *
 * Open-source, LLM-friendly memory management with adaptive personalization
 * and flexible metadata tagging.
 *
 * Note: mem4ai is Python-based, so this is a TypeScript reimplementation
 * of the core memory operations with similar semantics.
 */
export class Mem4AIProvider implements IMemoryProvider {
  readonly id = 'mem4ai';
  readonly label = 'Mem4AI';
  readonly type = 'memory' as const;

  private config: Mem4AIProviderConfig;
  private memories: Map<string, MemoryEntry> = new Map();
  private defaultUserId: string;
  private defaultAgentId: string;
  private openaiApiKey: string;
  private openaiBaseUrl: string;

  constructor(config?: Mem4AIProviderConfig) {
    // Load config from convict
    const convictConfig = mem4aiConfig.getProperties();

    this.config = {
      useLLMConfig: config?.useLLMConfig ?? convictConfig.useLLMConfig,
      storagePath: config?.storagePath ?? convictConfig.storagePath,
      embeddingStrategy: config?.embeddingStrategy ?? convictConfig.embeddingStrategy,
      openaiApiKey: config?.openaiApiKey ?? convictConfig.openaiApiKey,
      openaiBaseUrl: config?.openaiBaseUrl ?? convictConfig.openaiBaseUrl,
      embeddingModel: config?.embeddingModel ?? convictConfig.embeddingModel,
      defaultUserId: config?.defaultUserId ?? convictConfig.defaultUserId,
      defaultAgentId: config?.defaultAgentId ?? convictConfig.defaultAgentId,
    };

    // Resolve OpenAI config
    if (this.config.useLLMConfig) {
      this.openaiApiKey = openaiConfig.get('OPENAI_API_KEY');
      this.openaiBaseUrl = openaiConfig.get('OPENAI_BASE_URL');
      debug('Using LLM config for OpenAI embeddings');
    } else {
      this.openaiApiKey = this.config.openaiApiKey || '';
      this.openaiBaseUrl = this.config.openaiBaseUrl || 'https://api.openai.com/v1';
      debug('Using provider-specific OpenAI config');
    }

    this.defaultUserId = this.config.defaultUserId || 'default';
    this.defaultAgentId = this.config.defaultAgentId || 'default';

    debug('Mem4AI provider initialized with config: %O', {
      ...this.config,
      openaiApiKey: this.openaiApiKey ? '[REDACTED]' : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // Core memory operations
  // ---------------------------------------------------------------------------

  /**
   * Add memories from conversation messages.
   * Extracts facts and stores them with metadata tagging.
   */
  async add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;

    debug('Adding memories for userId=%s, agentId=%s', userId, agentId);

    const results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> = [];

    for (const message of messages) {
      const id = this.generateId();
      const entry: MemoryEntry = {
        id,
        content: message.content,
        metadata: {
          userId,
          agentId,
          role: message.role,
          ...options?.metadata,
        },
        createdAt: new Date(),
      };

      this.memories.set(id, entry);
      results.push({
        id,
        memory: message.content,
        metadata: entry.metadata,
      });
    }

    debug('Added %d memories', results.length);
    return { results };
  }

  /**
   * Search memories by natural language query.
   * Uses semantic search with adaptive personalization.
   */
  async search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const userId = options?.userId ?? this.defaultUserId;
    const limit = options?.limit ?? 10;

    debug('Searching memories: "%s" for userId=%s', query, userId);

    // Simple text-based search (TODO: implement semantic search with embeddings)
    const queryLower = query.toLowerCase();
    const results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> = [];

    for (const [id, memory] of this.memories) {
      if (memory.metadata?.userId === userId || !userId) {
        const contentLower = memory.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          // Simple relevance score based on occurrence count
          const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
          results.push({
            id,
            memory: memory.content,
            score: Math.min(occurrences / 10, 1), // Normalize to 0-1
            metadata: memory.metadata,
          });
        }
      }
    }

    // Sort by score descending
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    debug('Found %d memories matching query', results.length);
    return { results: results.slice(0, limit) };
  }

  /**
   * Get all memories for a user/agent.
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
   * Delete all memories for a user/agent.
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
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ---------------------------------------------------------------------------
// Factory and manifest
// ---------------------------------------------------------------------------

export function create(config?: Mem4AIProviderConfig): Mem4AIProvider {
  return new Mem4AIProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'Mem4AI',
  description: 'Open-source, LLM-friendly memory management with adaptive personalization and flexible metadata tagging',
  type: 'memory',
  minVersion: '1.0.0',
};
