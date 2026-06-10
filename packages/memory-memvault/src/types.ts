import type { MemoryEntry } from '@hivemind/shared-types';

/**
 * Configuration for {@link MemVaultProvider}.
 */
export interface MemVaultConfig {
  /**
   * Name of the LLM provider (its `name` field) to use for embeddings. When
   * omitted, the first provider exposing `generateEmbedding()` is used.
   */
  embeddingProfile?: string;
  /** Weight applied to vector similarity (default 0.8). */
  vectorWeight?: number;
  /** Weight applied to the recency-decay term (default 0.2). */
  recencyWeight?: number;
  /** Recency-decay half-life in milliseconds (default 7 days). */
  recencyHalfLifeMs?: number;
  /** Default number of results returned by searches that omit `limit`. */
  defaultLimit?: number;
  /**
   * Persist memories through the host application's database when one is
   * available (default `true`). Set to `false` to force the non-durable
   * in-process store even when a database manager is injected.
   */
  durable?: boolean;
}

/**
 * A stored record inside a {@link MemVaultStore}. Extends the public
 * {@link MemoryEntry} with the embedding vector used for hybrid scoring.
 */
export interface StoredMemory extends MemoryEntry {
  /** The embedding vector computed at write time. */
  embedding: number[];
}

/**
 * Pluggable persistence backend for MemVault.
 *
 * The default in-process implementation ({@link InMemoryMemVaultStore}) keeps
 * records in a Map and requires no external infrastructure. A future
 * Postgres + pgvector store can implement this same contract without touching
 * the provider's scoring or API surface.
 */
export interface MemVaultStore {
  put(record: StoredMemory): Promise<void>;
  get(id: string): Promise<StoredMemory | null>;
  delete(id: string): Promise<boolean>;
  /** Return all records matching the given scope (no scope = all records). */
  list(scope?: { userId?: string; agentId?: string }): Promise<StoredMemory[]>;
  /** Delete all records matching the given scope; returns the count removed. */
  clear(scope?: { userId?: string; agentId?: string }): Promise<number>;
  /** Lightweight readiness probe. */
  isReady(): boolean;
}
