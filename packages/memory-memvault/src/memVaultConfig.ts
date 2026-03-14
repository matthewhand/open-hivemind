/**
 * MemVault Configuration for Open Hivemind
 *
 * Configuration interface for the MemVault memory provider.
 * MemVault is an open-source RAG memory server built natively in Node.js
 * with Postgres + pgvector; uses hybrid scoring (vector similarity × 0.8) + (recency decay × 0.2).
 */

export interface MemVaultConfig {
    /** PostgreSQL host */
    host: string;
    /** PostgreSQL port */
    port: number;
    /** PostgreSQL database name */
    database: string;
    /** PostgreSQL username */
    user: string;
    /** PostgreSQL password */
    password: string;
    /** Connection pool maximum size */
    max?: number;
    /** Connection idle timeout in milliseconds */
    idleTimeoutMillis?: number;
    /** Connection timeout in milliseconds */
    connectionTimeoutMillis?: number;
    /** LLM profile key/id to use for embedding generation */
    llmProfileKey?: string;
    /** @deprecated Use llmProfileKey instead. */
    embeddingProfileKey?: string;
    /** Optional callback for generating embeddings via a configured LLM profile */
    embeddingResolver?: (content: string, profileKey: string) => Promise<number[]>;
    /** Embedding model endpoint for vector generation (legacy fallback) */
    embeddingEndpoint?: string;
    /** Embedding API key (optional legacy fallback) */
    embeddingApiKey?: string;
    /** Embedding model name (optional legacy fallback) */
    embeddingModel?: string;
    /** Vector dimension size (default: 1536 for OpenAI) */
    vectorDimension?: number;
    /** Hybrid scoring: vector similarity weight (default: 0.8) */
    vectorWeight?: number;
    /** Hybrid scoring: recency decay weight (default: 0.2) */
    recencyWeight?: number;
    /** Enable debug logging */
    debug?: boolean;
}

export const DEFAULT_MEMVAULT_CONFIG: Partial<MemVaultConfig> = {
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    vectorDimension: 1536,
    vectorWeight: 0.8,
    recencyWeight: 0.2,
    debug: false,
};
