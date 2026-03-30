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
  Mem0ApiError,
  type Mem0AddResponse,
  type Mem0Config,
  type Mem0GetResponse,
  type Mem0ListResponse,
  type Mem0Memory,
  type Mem0SearchResponse,
  type Mem0UpdateResponse,
} from './types';

const debug = Debug('hivemind:memory-mem0');

const DEFAULT_BASE_URL = 'https://api.mem0.ai/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

export class Mem0Provider implements IMemoryProvider {
  readonly id = 'mem0';
  readonly label = 'Mem0';
  readonly type = 'memory' as const;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultUserId?: string;
  private readonly defaultAgentId?: string;
  private readonly orgId?: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly circuitBreaker: CircuitBreakerType;

  constructor(config: Mem0Config) {
    if (!config.apiKey) {
      throw new Error('Mem0Provider: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.defaultUserId = config.userId;
    this.defaultAgentId = config.agentId;
    this.orgId = config.orgId;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.circuitBreaker = getCircuitBreaker({
      name: 'mem0',
      failureThreshold: config.circuitBreaker?.failureThreshold ?? 5,
      resetTimeoutMs: config.circuitBreaker?.resetTimeoutMs ?? 30_000,
      halfOpenMaxAttempts: config.circuitBreaker?.halfOpenMaxAttempts ?? 3,
    });

    debug(
      'Mem0Provider initialised (baseUrl=%s, userId=%s, agentId=%s)',
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
    if (metadata) {
      body.metadata = metadata;
    }
    const res = await this.request<Mem0AddResponse>('POST', '/memories/', body);
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
    };
    if (options?.limit != null) {
      body.limit = options.limit;
    }
    const res = await this.request<Mem0SearchResponse>('POST', '/memories/search/', body);
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
    const res = await this.request<Mem0ListResponse>('GET', path);
    return res.results.map(toMemoryEntry);
  }

  async getMemory(id: string): Promise<MemoryEntry | null> {
    try {
      const res = await this.request<Mem0GetResponse>(
        'GET',
        `/memories/${encodeURIComponent(id)}/`
      );
      return toMemoryEntry(res);
    } catch (err) {
      if (err instanceof Mem0ApiError && err.status === 404) {
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
    const res = await this.request<Mem0UpdateResponse>(
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

  async deleteAll(options?: MemoryScopeOptions): Promise<void> {
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
      await this.request<Mem0ListResponse>('GET', `/memories/?${params.toString()}`);
      return { status: 'ok' };
    } catch (err) {
      return {
        status: 'error',
        details: { message: err instanceof Error ? err.message : String(err) },
      };
    }
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
    if (options?.metadata) {
      body.metadata = options.metadata;
    }
    const res = await this.request<Mem0AddResponse>('POST', '/memories/', body);
    return { results: res.results.map(toLegacyResult) };
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
    };
    if (options?.limit != null) {
      body.limit = options.limit;
    }
    const res = await this.request<Mem0SearchResponse>('POST', '/memories/search/', body);
    return { results: res.results.map(toLegacyResult) };
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
    const apiPath = qs ? `/memories/?${qs}` : '/memories/';
    const res = await this.request<Mem0ListResponse>('GET', apiPath);
    return { results: res.results.map((m) => ({ id: m.id, memory: m.memory })) };
  }

  async get(memoryId: string): Promise<{ id: string; memory: string } | null> {
    try {
      const res = await this.request<Mem0GetResponse>(
        'GET',
        `/memories/${encodeURIComponent(memoryId)}/`
      );
      return { id: res.id, memory: res.memory };
    } catch (err) {
      if (err instanceof Mem0ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async update(memoryId: string, newContent: string): Promise<{ id: string; memory: string }> {
    const res = await this.request<Mem0UpdateResponse>(
      'PUT',
      `/memories/${encodeURIComponent(memoryId)}/`,
      { text: newContent }
    );
    return { id: res.id, memory: res.memory };
  }

  async delete(memoryId: string): Promise<void> {
    await this.request<void>('DELETE', `/memories/${encodeURIComponent(memoryId)}/`);
  }

  // ---------------------------------------------------------------------------
  // HTTP transport
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return this.doRequest<T>(method, path, body);
    });
  }

  private async doRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.orgId) {
      headers['X-Org-Id'] = this.orgId;
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
          lastError = new Mem0ApiError(
            `Mem0 API ${method} ${path} returned ${response.status}: ${text}`,
            response.status,
            text
          );
          debug('Retryable error: %s', lastError.message);
          continue;
        }

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Mem0ApiError(
            `Mem0 API ${method} ${path} returned ${response.status}: ${text}`,
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
        if (err instanceof Mem0ApiError) {
          if (err.status !== 429 && err.status < 500) {
            throw err;
          }
          lastError = err;
        } else if ((err as any)?.name === 'AbortError') {
          lastError = new Error(`Mem0 API ${method} ${path} timed out after ${this.timeoutMs}ms`);
          debug('Timeout: %s', lastError.message);
        } else {
          lastError = err instanceof Error ? err : new Error(String(err));
          debug('Network error: %s', lastError.message);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new Error('Mem0 API request failed after retries');
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Convert a Mem0 API memory object to the canonical MemoryEntry shape. */
function toMemoryEntry(m: Mem0Memory): MemoryEntry {
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

/** Convert a Mem0 API memory to the legacy result shape used by the old API. */
function toLegacyResult(m: Mem0Memory): {
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
