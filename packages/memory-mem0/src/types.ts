/**
 * Mem0 REST API response types.
 *
 * These mirror the JSON shapes returned by the mem0.ai v1 API so we can
 * type-check responses without pulling in the official SDK.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface Mem0Config {
  /** Mem0 / OpenAI API key used for auth */
  apiKey: string;
  /** Base URL of the Mem0 REST API (default: https://api.mem0.ai/v1) */
  baseUrl?: string;
  /** Default user scope for memories */
  userId?: string;
  /** Default agent scope for memories */
  agentId?: string;
  /** Optional organisation ID header */
  orgId?: string;

  // --- fields surfaced in the UI schema (mem0.ts) ---
  /** LLM provider used for fact extraction (e.g. 'openai', 'anthropic') */
  llmProvider?: string;
  /** Model name for fact extraction */
  llmModel?: string;
  /** Model used to generate memory embeddings */
  embedderModel?: string;
  /** Vector store backend ('memory' | 'qdrant' | 'pinecone') */
  vectorStoreProvider?: string;
  /** Path to SQLite history DB (optional) */
  historyDbPath?: string;

  // --- operational knobs ---
  /** Request timeout in milliseconds (default: 30 000) */
  timeoutMs?: number;
  /** Maximum number of retries on 429/5xx (default: 3) */
  maxRetries?: number;

  // --- circuit breaker tuning ---
  /** Override default circuit breaker thresholds */
  circuitBreaker?: {
    /** Consecutive failures before opening the circuit (default: 5) */
    failureThreshold?: number;
    /** Time in ms before moving from OPEN to HALF_OPEN (default: 30 000) */
    resetTimeoutMs?: number;
    /** Max probe requests in HALF_OPEN state (default: 3) */
    halfOpenMaxAttempts?: number;
  };
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/** A single memory as returned by the Mem0 API. */
export interface Mem0Memory {
  id: string;
  memory: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  event?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  agent_id?: string;
}

/** Envelope returned by POST /memories/ (add). */
export interface Mem0AddResponse {
  results: Mem0Memory[];
}

/** Envelope returned by GET /memories/ (list) and POST /memories/search/. */
export interface Mem0ListResponse {
  results: Mem0Memory[];
}

/** Envelope returned by POST /memories/search/. */
export interface Mem0SearchResponse {
  results: Mem0Memory[];
}

/** Shape returned by GET /memories/{id}/ (single memory). */
export type Mem0GetResponse = Mem0Memory;

/** Shape returned by PUT /memories/{id}/ (update). */
export interface Mem0UpdateResponse {
  id: string;
  memory: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export class Mem0ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'Mem0ApiError';
  }
}
