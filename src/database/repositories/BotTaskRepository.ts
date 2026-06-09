import Debug from 'debug';
import type { IDatabase as Database } from '../types';

const debug = Debug('app:BotTaskRepository');

/**
 * Row shape persisted in `bot_scheduled_tasks` (see migration 002).
 * Structurally identical to BotTaskScheduler's `ScheduledTask` — defined here
 * so the database layer does not depend on a server service module.
 */
export interface BotScheduledTaskRecord {
  id: string;
  botId: string;
  botName: string;
  prompt: string;
  intervalMs: number;
  lastRun?: string;
  nextRun: number;
  enabled: boolean;
}

/**
 * Repository for BotTaskScheduler's durable task store.
 *
 * Follows the AnomalyRepository pattern: closures over the live DB handle and
 * connection state, graceful no-ops when the database is unavailable (the
 * scheduler keeps working in memory; tasks just won't survive a restart).
 */
export class BotTaskRepository {
  constructor(
    private getDb: () => Database | null,
    private isConnected: () => boolean,
    private isPostgres: () => boolean = () => false
  ) {}

  private mapRow(row: Record<string, any>): BotScheduledTaskRecord {
    return {
      id: row.id,
      botId: row.botId,
      botName: row.botName,
      prompt: row.prompt,
      intervalMs: Number(row.intervalMs),
      lastRun: row.lastRun ?? undefined,
      nextRun: Number(row.nextRun),
      enabled: !!row.enabled,
    };
  }

  /** Load every persisted scheduled task (used to hydrate the scheduler). */
  async getAllTasks(): Promise<BotScheduledTaskRecord[]> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return [];
    }

    try {
      const rows = await db.all(`SELECT * FROM bot_scheduled_tasks ORDER BY nextRun ASC`);
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      debug('Error loading scheduled tasks:', error);
      throw error;
    }
  }

  /** Insert a task or update the existing row with the same id. */
  async upsertTask(task: BotScheduledTaskRecord): Promise<void> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      debug('Database not connected, scheduled task not stored');
      return;
    }

    try {
      // SQLite supports `INSERT OR REPLACE`; Postgres needs the equivalent
      // `ON CONFLICT (id) DO UPDATE` upsert (same split as AnomalyRepository).
      const sql = this.isPostgres()
        ? `
        INSERT INTO bot_scheduled_tasks (
          id, botId, botName, prompt, intervalMs, lastRun, nextRun, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          botId = EXCLUDED.botId, botName = EXCLUDED.botName,
          prompt = EXCLUDED.prompt, intervalMs = EXCLUDED.intervalMs,
          lastRun = EXCLUDED.lastRun, nextRun = EXCLUDED.nextRun,
          enabled = EXCLUDED.enabled
      `
        : `
        INSERT OR REPLACE INTO bot_scheduled_tasks (
          id, botId, botName, prompt, intervalMs, lastRun, nextRun, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.run(sql, [
        task.id,
        task.botId,
        task.botName,
        task.prompt,
        task.intervalMs,
        task.lastRun ?? null,
        task.nextRun,
        task.enabled ? 1 : 0,
      ]);

      debug(`Scheduled task stored: ${task.id}`);
    } catch (error) {
      debug('Error storing scheduled task:', error);
      throw error;
    }
  }

  /** Delete a task by id. Returns true if a row was removed. */
  async deleteTask(taskId: string): Promise<boolean> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return false;
    }

    try {
      const result = await db.run(`DELETE FROM bot_scheduled_tasks WHERE id = ?`, [taskId]);
      return (result.changes ?? 0) > 0;
    } catch (error) {
      debug('Error deleting scheduled task:', error);
      throw error;
    }
  }
}
