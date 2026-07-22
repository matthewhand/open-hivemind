/**
 * Migration 002: Add the `bot_scheduled_tasks` table.
 *
 * BotTaskScheduler previously kept scheduled prompts only in memory
 * (`loadTasks()` was an empty stub), so every task died on restart. This
 * table is the durable backing store the scheduler hydrates from on startup
 * and writes through to on create/run/delete.
 *
 * `CREATE TABLE IF NOT EXISTS` keeps the migration idempotent (same style as
 * 000/001). Column types are chosen to work on both SQLite and Postgres:
 * BIGINT for epoch-ms timestamps, INTEGER 0/1 for the enabled flag.
 */
import type { IDatabase } from '../types';

interface MigrationContext {
  db: IDatabase;
  dialect: 'sqlite' | 'postgres' | 'mysql';
}

export async function up({ db }: MigrationContext): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bot_scheduled_tasks (
      id TEXT PRIMARY KEY,
      botId TEXT NOT NULL,
      botName TEXT NOT NULL,
      prompt TEXT NOT NULL,
      intervalMs BIGINT NOT NULL,
      lastRun TEXT,
      nextRun BIGINT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    )
  `);

  // BotTaskScheduler.getTasksForBot filters by botId.
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_scheduled_tasks_bot ON bot_scheduled_tasks(botId)`
  );
}

export async function down({ db }: MigrationContext): Promise<void> {
  await db.exec(`DROP INDEX IF EXISTS idx_bot_scheduled_tasks_bot`);
  await db.exec(`DROP TABLE IF EXISTS bot_scheduled_tasks`);
}
