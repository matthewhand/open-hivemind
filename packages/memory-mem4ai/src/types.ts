/**
 * Mem4ai REST API types.
 *
 * These mirror the JSON shapes returned by the Mem4ai API so we can
 * type-check responses without pulling in an official SDK.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface Mem4aiConfig {
  /** Mem4ai API endpoint (required) */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Optional organization ID sent as X-Organization-ID header */
  organizationId?: string;
  /** Default user scope for memory operations */
  userId?: string;
  /** Default agent scope for memory operations */
  agentId?: string;
  /** LLM profile key used for embedding-driven memory operations */
  embeddingProviderId?: string;
  /** Maximum memories returned per query (default: 10) */
  limit?: number;
  /** Request timeout in milliseconds (default: 30 000) */
  timeout?: number;
  /** Maximum number of retries on 429/5xx (default: 3) */
  maxRetries?: number;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/** A single memory as returned by the Mem4ai API. */
export interface Mem4aiMemory {
  id: string;
  memory: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  agent_id?: string;
}

/** Envelope returned by POST /memories/ (add). */
export interface Mem4aiAddResponse {
  results: Mem4aiMemory[];
}

/** Envelope returned by GET /memories/ (list). */
export interface Mem4aiListResponse {
  results: Mem4aiMemory[];
}

/** Envelope returned by POST /memories/search/. */
export interface Mem4aiSearchResponse {
  results: Mem4aiMemory[];
}

/** Shape returned by GET /memories/{id}/ (single memory). */
export type Mem4aiGetResponse = Mem4aiMemory;

/** Shape returned by PUT /memories/{id}/ (update). */
export interface Mem4aiUpdateResponse {
  id: string;
  memory: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export class Mem4aiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'Mem4aiApiError';
  }
}
