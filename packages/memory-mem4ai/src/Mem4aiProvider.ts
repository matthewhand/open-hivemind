import Debug from 'debug';
import type {
  IMemoryProvider,
  MemoryEntry,
  MemoryScopeOptions,
  MemorySearchResult,
} from '@hivemind/shared-types';
import {
  getCircuitBreaker,
  type CircuitBreaker as CircuitBreakerType,
} from '@common/CircuitBreaker';
import {
  Mem4aiApiError,
  type Mem4aiAddResponse,
  type Mem4aiConfig,
  type Mem4aiGetResponse,
  type Mem4aiListResponse,
  type Mem4aiMemory,
  type Mem4aiSearchResponse,
  type Mem4aiUpdateResponse,
} from './types';

const debug = Debug('hivemind:memory-mem4ai');

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_LIMIT = 10;
const INITIAL_BACKOFF_MS = 1_000;

export class Mem4aiProvider implements IMemoryProvider {
  readonly id = 'mem4ai';
  readonly label = 'Mem4ai';
  readonly type = 'memory' as const;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultUserId?: string;
  private readonly defaultAgentId?: string;
  private readonly organizationId?: string;
  private readonly embeddingProviderId?: string;
  private readonly defaultLimit: number;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly circuitBreaker: CircuitBreakerType;

  constructor(config: Mem4aiConfig) {
    if (!config.apiKey) {
      throw new Error('Mem4aiProvider: apiKey is required');
    }
    if (!config.apiUrl) {
      throw new Error('Mem4aiProvider: apiUrl is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.apiUrl.replace(/\/+$/, '');
    this.defaultUserId = config.userId;
    this.defaultAgentId = config.agentId;
    this.organizationId = config.organizationId;
    this.embeddingProviderId = config.embeddingProviderId;
    this.defaultLimit = config.limit ?? DEFAULT_LIMIT;
    this.timeoutMs = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.circuitBreaker = getCircuitBreaker({
      name: 'mem4ai',
      failureThreshold: config.circuitBreaker?.failureThreshold ?? 5,
      resetTimeoutMs: config.circuitBreaker?.resetTimeoutMs ?? 30_000,
      halfOpenMaxAttempts: config.circuitBreaker?.halfOpenMaxAttempts ?? 3,
    });

    debug(
      'Mem4aiProvider initialised (baseUrl=%s, userId=%s, agentId=%s)',
      this.baseUrl,
      this.defaultUserId ?? '<none>',
      this.defaultAgentId ?? '<none>'
    );
  }

  // ---------------------------------------------------------------------------
  // IMemoryProvider implementation
  // ---------------------------------------------------------------------------

  async addMemory(
    content: string,
    metadata?: Record<string, unknown>,
    options?: MemoryScopeOptions
  ): Promise<MemoryEntry> {
    const body: Record<string, unknown> = {
      messages: [{ role: 'user' as const, content }],
      user_id: options?.userId ?? this.defaultUserId,
      agent_id: options?.agentId ?? this.defaultAgentId,
    };
    if (this.embeddingProviderId) {
      body.embedding_provider_id = this.embeddingProviderId;
    }
    if (metadata) {
      body.metadata = metadata;
    }
    const res = await this.request<Mem4aiAddResponse>('POST', '/memories/', body);
    const first = res.results[0];
    return toMemoryEntry(first);
  }

  async searchMemories(
    query: string,
    options?: { limit?: number; threshold?: number } & MemoryScopeOptions
  ): Promise<MemorySearchResult> {
    const body: Record<string, unknown> = {
      query,
      user_id: options?.userId ?? this.defaultUserId,
      agent_id: options?.agentId ?? this.defaultAgentId,
      limit: options?.limit ?? this.defaultLimit,
    };
    if (this.embeddingProviderId) {
      body.embedding_provider_id = this.embeddingProviderId;
    }
    const res = await this.request<Mem4aiSearchResponse>('POST', '/memories/search/', body);
    const entries = res.results
      .map(toMemoryEntry)
      .filter((e) => options?.threshold == null || (e.score ?? 0) >= options.threshold);
    return { results: entries };
  }

  async getMemories(options?: { limit?: number } & MemoryScopeOptions): Promise<MemoryEntry[]> {
    const params = new URLSearchParams();
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;
    if (userId) params.set('user_id', userId);
    if (agentId) params.set('agent_id', agentId);
    const qs = params.toString();
    const path = qs ? `/memories/?${qs}` : '/memories/';
    const res = await this.request<Mem4aiListResponse>('GET', path);
    return res.results.map(toMemoryEntry);
  }

  async getMemory(id: string): Promise<MemoryEntry | null> {
    try {
      const res = await this.request<Mem4aiGetResponse>(
        'GET',
        `/memories/${encodeURIComponent(id)}/`
      );
      return toMemoryEntry(res);
    } catch (err) {
      if (err instanceof Mem4aiApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async updateMemory(
    id: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryEntry> {
    const body: Record<string, unknown> = { text: content };
    if (metadata) {
      body.metadata = metadata;
    }
    const res = await this.request<Mem4aiUpdateResponse>(
      'PUT',
      `/memories/${encodeURIComponent(id)}/`,
      body
    );
    return {
      id: res.id,
      content: res.memory,
      ...(metadata ? { metadata } : {}),
      timestamp: Date.now(),
    };
  }

  async deleteMemory(id: string): Promise<void> {
    await this.request<void>('DELETE', `/memories/${encodeURIComponent(id)}/`);
  }

  // ---------------------------------------------------------------------------
  // Legacy convenience methods (delegate to IMemoryProvider methods)
  // ---------------------------------------------------------------------------

  async add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> }
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }>;
  }> {
    const body: Record<string, unknown> = {
      messages,
      user_id: options?.userId ?? this.defaultUserId,
      agent_id: options?.agentId ?? this.defaultAgentId,
    };
    if (this.embeddingProviderId) {
      body.embedding_provider_id = this.embeddingProviderId;
    }
    if (options?.metadata) {
      body.metadata = options.metadata;
    }
    const res = await this.request<Mem4aiAddResponse>('POST', '/memories/', body);
    return { results: res.results.map(toResult) };
  }

  async search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number }
  ): Promise<{
    results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }>;
  }> {
    const body: Record<string, unknown> = {
      query,
      user_id: options?.userId ?? this.defaultUserId,
      agent_id: options?.agentId ?? this.defaultAgentId,
      limit: options?.limit ?? this.defaultLimit,
    };
    if (this.embeddingProviderId) {
      body.embedding_provider_id = this.embeddingProviderId;
    }
    const res = await this.request<Mem4aiSearchResponse>('POST', '/memories/search/', body);
    return { results: res.results.map(toResult) };
  }

  async getAll(options?: {
    userId?: string;
    agentId?: string;
  }): Promise<{ results: Array<{ id: string; memory: string }> }> {
    const params = new URLSearchParams();
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;
    if (userId) params.set('user_id', userId);
    if (agentId) params.set('agent_id', agentId);
    const qs = params.toString();
    const path = qs ? `/memories/?${qs}` : '/memories/';
    const res = await this.request<Mem4aiListResponse>('GET', path);
    return { results: res.results.map((m) => ({ id: m.id, memory: m.memory })) };
  }

  async get(memoryId: string): Promise<{ id: string; memory: string } | null> {
    try {
      const res = await this.request<Mem4aiGetResponse>(
        'GET',
        `/memories/${encodeURIComponent(memoryId)}/`
      );
      return { id: res.id, memory: res.memory };
    } catch (err) {
      if (err instanceof Mem4aiApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async update(memoryId: string, newContent: string): Promise<{ id: string; memory: string }> {
    const res = await this.request<Mem4aiUpdateResponse>(
      'PUT',
      `/memories/${encodeURIComponent(memoryId)}/`,
      { text: newContent }
    );
    return { id: res.id, memory: res.memory };
  }

  async delete(memoryId: string): Promise<void> {
    await this.request<void>('DELETE', `/memories/${encodeURIComponent(memoryId)}/`);
  }

  async deleteAll(options?: { userId?: string; agentId?: string }): Promise<void> {
    const params = new URLSearchParams();
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;
    if (userId) params.set('user_id', userId);
    if (agentId) params.set('agent_id', agentId);
    const qs = params.toString();
    const path = qs ? `/memories/?${qs}` : '/memories/';
    await this.request<void>('DELETE', path);
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; details?: Record<string, unknown> }> {
    try {
      const params = new URLSearchParams({ limit: '1' });
      if (this.defaultUserId) params.set('user_id', this.defaultUserId);
      await this.request<Mem4aiListResponse>('GET', `/memories/?${params.toString()}`);
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        details: { message: err instanceof Error ? err.message : String(err) },
      };
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return this.doRequest<T>(method, path, body);
    });
  }

  private async doRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.organizationId) {
      headers['X-Organization-ID'] = this.organizationId;
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const backoff = INITIAL_BACKOFF_MS * 2 ** (attempt - 1);
        debug('Retry %d/%d after %dms', attempt, this.maxRetries, backoff);
        await sleep(backoff);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        debug('%s %s', method, url);
        const fetchOpts: RequestInit = { method, headers, signal: controller.signal };
        if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
          fetchOpts.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOpts);

        if (response.status === 429 || response.status >= 500) {
          const text = await response.text().catch(() => '');
          lastError = new Mem4aiApiError(
            `Mem4ai API ${method} ${path} returned ${response.status}: ${text}`,
            response.status,
            text
          );
          debug('Retryable error: %s', lastError.message);
          continue;
        }

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Mem4aiApiError(
            `Mem4ai API ${method} ${path} returned ${response.status}: ${text}`,
            response.status,
            text
          );
        }

        if (response.status === 204) {
          return undefined as unknown as T;
        }

        const json = await response.json();
        return json as T;
      } catch (err) {
        if (err instanceof Mem4aiApiError) {
          if (err.status !== 429 && err.status < 500) {
            throw err;
          }
          lastError = err;
        } else if ((err as any)?.name === 'AbortError') {
          lastError = new Error(`Mem4ai API ${method} ${path} timed out after ${this.timeoutMs}ms`);
          debug('Timeout: %s', lastError.message);
        } else {
          lastError = err instanceof Error ? err : new Error(String(err));
          debug('Network error: %s', lastError.message);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error('Mem4ai API request failed after retries');
  }
}

/** Convert a Mem4ai API memory object to the canonical MemoryEntry shape. */
function toMemoryEntry(m: Mem4aiMemory): MemoryEntry {
  return {
    id: m.id,
    content: m.memory,
    ...(m.score != null ? { score: m.score } : {}),
    ...(m.metadata ? { metadata: m.metadata } : {}),
    ...(m.user_id ? { userId: m.user_id } : {}),
    ...(m.agent_id ? { agentId: m.agent_id } : {}),
    ...(m.created_at ? { timestamp: new Date(m.created_at).getTime() } : {}),
  };
}

/** Convert a Mem4ai API memory to the legacy result shape used by the old API. */
function toResult(m: Mem4aiMemory): {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, any>;
} {
  return {
    id: m.id,
    memory: m.memory,
    ...(m.score != null ? { score: m.score } : {}),
    ...(m.metadata ? { metadata: m.metadata as Record<string, any> } : {}),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
