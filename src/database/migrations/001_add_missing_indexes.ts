/**
 * Migration 001: Add indexes for query patterns the baseline schema missed.
 *
 * Each `CREATE INDEX IF NOT EXISTS` is idempotent — safe to re-run, safe on
 * fresh databases. The bodies were chosen to match concrete read paths in
 * the repositories (cited inline). All are additive — no rows touched.
 */
import type { IDatabase } from '../types';

interface MigrationContext {
  db: IDatabase;
  isPostgres: boolean;
}

export async function up({ db }: MigrationContext): Promise<void> {
  // DecisionRepository.ts:68 — `ORDER BY timestamp DESC LIMIT ?`
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_decisions_timestamp ON decisions(timestamp DESC)`
  );

  // ApprovalRepository.ts:91-109 — filter by status, order by createdAt DESC
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_approval_requests_status_created
     ON approval_requests(status, createdAt DESC)`
  );
  // Same repo: lookup by (resourceType, resourceId)
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_approval_requests_resource
     ON approval_requests(resourceType, resourceId)`
  );

  // AnomalyRepository.ts:85,111 — order by timestamp DESC; line 103: filter resolved
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp DESC)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_anomalies_resolved_timestamp
     ON anomalies(resolved, timestamp DESC)`
  );

  // MemoryRepository.ts:147-160 — `getMemories` orders by created_at DESC
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC)`
  );

  // MessageRepository.ts:266-274 — bot_metrics ORDER BY updated_at DESC
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_metrics_updated_at ON bot_metrics(updated_at DESC)`
  );

  // inference_logs: typical query is "this bot, newest first"
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_inference_logs_bot_timestamp
     ON inference_logs(botName, timestamp DESC)`
  );
}

export async function down({ db }: MigrationContext): Promise<void> {
  await db.exec(`DROP INDEX IF EXISTS idx_decisions_timestamp`);
  await db.exec(`DROP INDEX IF EXISTS idx_approval_requests_status_created`);
  await db.exec(`DROP INDEX IF EXISTS idx_approval_requests_resource`);
  await db.exec(`DROP INDEX IF EXISTS idx_anomalies_timestamp`);
  await db.exec(`DROP INDEX IF EXISTS idx_anomalies_resolved_timestamp`);
  await db.exec(`DROP INDEX IF EXISTS idx_memories_created_at`);
  await db.exec(`DROP INDEX IF EXISTS idx_bot_metrics_updated_at`);
  await db.exec(`DROP INDEX IF EXISTS idx_inference_logs_bot_timestamp`);
}
