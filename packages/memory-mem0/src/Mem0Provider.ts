import Debug from 'debug';
import type {
  Mem0Config,
  Mem0Memory,
  Mem0AddResponse,
  Mem0ListResponse,
  Mem0SearchResponse,
  Mem0GetResponse,
  Mem0UpdateResponse,
} from './types';
import { Mem0ApiError } from './types';
import { getCircuitBreaker, type CircuitBreaker as CircuitBreakerType } from '@src/common/CircuitBreaker';
import { errorRecovery, type RetryConfig, DEFAULT_RETRY_CONFIG } from '@src/utils/errorRecovery';

const debug = Debug('hivemind:memory-mem0');

const DEFAULT_BASE_URL = 'https://api.mem0.ai/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;

export class Mem0Provider {
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
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      halfOpenMaxAttempts: 3,
    });

    debug('Mem0Provider initialised (baseUrl=%s, userId=%s, agentId=%s)',
      this.baseUrl, this.defaultUserId ?? '<none>', this.defaultAgentId ?? '<none>');
  }

  async add(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { userId?: string; agentId?: string; metadata?: Record<string, any> },
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const body: Record<string, unknown> = {
      messages,
      user_id: options?.userId ?? this.defaultUserId,
      agent_id: options?.agentId ?? this.defaultAgentId,
    };
    if (options?.metadata) {
      body.metadata = options.metadata;
    }
    const res = await this.request<Mem0AddResponse>('POST', '/memories/', body);
    return { results: res.results.map(toResult) };
  }

  async search(
    query: string,
    options?: { userId?: string; agentId?: string; limit?: number },
  ): Promise<{ results: Array<{ id: string; memory: string; score?: number; metadata?: Record<string, any> }> }> {
    const body: Record<string, unknown> = {
      query,
      user_id: options?.userId ?? this.defaultUserId,
      agent_id: options?.agentId ?? this.defaultAgentId,
    };
    if (options?.limit != null) {
      body.limit = options.limit;
    }
    const res = await this.request<Mem0SearchResponse>('POST', '/memories/search/', body);
    return { results: res.results.map(toResult) };
  }

  async getAll(
    options?: { userId?: string; agentId?: string },
  ): Promise<{ results: Array<{ id: string; memory: string }> }> {
    const params = new URLSearchParams();
    const userId = options?.userId ?? this.defaultUserId;
    const agentId = options?.agentId ?? this.defaultAgentId;
    if (userId) params.set('user_id', userId);
    if (agentId) params.set('agent_id', agentId);
    const qs = params.toString();
    const path = qs ? `/memories/?${qs}` : '/memories/';
    const res = await this.request<Mem0ListResponse>('GET', path);
    return { results: res.results.map((m) => ({ id: m.id, memory: m.memory })) };
  }

  async get(memoryId: string): Promise<{ id: string; memory: string } | null> {
    try {
      const res = await this.request<Mem0GetResponse>('GET', `/memories/${encodeURIComponent(memoryId)}/`);
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
      { text: newContent },
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

  async healthCheck(): Promise<boolean> {
    try {
      const params = new URLSearchParams({ limit: '1' });
      if (this.defaultUserId) params.set('user_id', this.defaultUserId);
      await this.request<Mem0ListResponse>('GET', `/memories/?${params.toString()}`);
      return true;
    } catch {
      return false;
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
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.orgId) {
      headers['X-Org-Id'] = this.orgId;
    }

    const retryConfig: Partial<RetryConfig> = {
      maxRetries: this.maxRetries,
      retryableStatusCodes: [...DEFAULT_RETRY_CONFIG.retryableStatusCodes, 429],
      retryableErrors: [...DEFAULT_RETRY_CONFIG.retryableErrors, 'Mem0ApiError'],
    };

    const operation = async () => {
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
          throw new Mem0ApiError(
            `Mem0 API ${method} ${path} returned ${response.status}: ${text}`,
            response.status,
            text
          );
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
        if ((err as any)?.name === 'AbortError') {
          throw new Error(`Mem0 API ${method} ${path} timed out after ${this.timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };

    const result = await errorRecovery.withRetry(operation, retryConfig);

    if (!result.success) {
      throw result.error;
    }

    return result.result;
  }
}

function toResult(m: Mem0Memory): { id: string; memory: string; score?: number; metadata?: Record<string, any> } {
  return {
    id: m.id,
    memory: m.memory,
    ...(m.score != null ? { score: m.score } : {}),
    ...(m.metadata ? { metadata: m.metadata as Record<string, any> } : {}),
  };
}
