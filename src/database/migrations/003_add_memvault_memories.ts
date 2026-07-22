/**
 * Migration 003: Add the `memvault_memories` table.
 *
 * MemVault (packages/memory-memvault) previously kept memories only in an
 * in-process Map, so every stored memory died on restart. This table is the
 * durable backing store behind `DatabaseMemVaultStore`: the provider keeps an
 * in-memory cache on top and writes through to this table.
 *
 * The embedding vector is stored as a JSON-encoded TEXT column on **both**
 * SQLite and Postgres. A native Postgres/pgvector column (with an HNSW index
 * for server-side similarity search) is deliberately deferred — scoring
 * happens in-process today, so JSON round-tripping is sufficient and keeps
 * the schema identical across engines.
 *
 * `CREATE TABLE IF NOT EXISTS` keeps the migration idempotent (same style as
 * 000/001/002). BIGINT holds the epoch-ms timestamp used for recency decay.
 */
import type { IDatabase } from '../types';

interface MigrationContext {
  db: IDatabase;
  dialect: 'sqlite' | 'postgres' | 'mysql';
}

export async function up({ db }: MigrationContext): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS memvault_memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      metadata TEXT,
      userId TEXT,
      agentId TEXT
    )
  `);

  // Scoped lookups (per-user / per-agent) drive every list/clear call.
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_memvault_memories_user ON memvault_memories(userId)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_memvault_memories_agent ON memvault_memories(agentId)`
  );
}

export async function down({ db }: MigrationContext): Promise<void> {
  await db.exec(`DROP INDEX IF EXISTS idx_memvault_memories_agent`);
  await db.exec(`DROP INDEX IF EXISTS idx_memvault_memories_user`);
  await db.exec(`DROP TABLE IF EXISTS memvault_memories`);
}
