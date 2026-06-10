import Debug from 'debug';
import { type IDatabase, type InferenceLog } from '../types';

const debug = Debug('app:InferenceRepository');

export interface InferenceLogFilter {
  botName?: string;
  provider?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

/** Lightweight inference-log row without prompt/response payloads. */
export interface InferenceLogSummary {
  id: number | string;
  botName: string;
  tokensUsed: number | null;
  latencyMs: number | null;
  provider: string | null;
  status: string;
  errorMessage: string | null;
  timestamp: string;
}

export class InferenceRepository {
  constructor(
    private getDb: () => IDatabase | null,
    private isConnected: () => boolean,
    private isPostgres: () => boolean = () => false
  ) {}

  async logInference(log: InferenceLog): Promise<number | string> {
    if (!this.isConnected()) return 0;
    const db = this.getDb();
    if (!db) return 0;

    try {
      const sql = `
        INSERT INTO inference_logs 
        (botName, prompt, response, tokensUsed, latencyMs, provider, status, errorMessage) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        log.botName,
        log.prompt,
        log.response || null,
        log.tokensUsed || null,
        log.latencyMs || null,
        log.provider || null,
        log.status,
        log.errorMessage || null,
      ];

      const result = await db.run(sql, params);
      return result.lastID;
    } catch (error) {
      debug('Error logging inference:', error);
      return 0;
    }
  }

  /**
   * Query recorded inference logs (most recent first). Prompt/response bodies
   * are intentionally excluded — this serves usage/latency metrics endpoints.
   */
  async getInferenceLogs(filter: InferenceLogFilter = {}): Promise<InferenceLogSummary[]> {
    if (!this.isConnected()) return [];
    const db = this.getDb();
    if (!db) return [];

    try {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      // SQLite stores CURRENT_TIMESTAMP as 'YYYY-MM-DD HH:MM:SS'; normalize both
      // sides via datetime() so comparisons against ISO-8601 params behave
      // correctly. Postgres TIMESTAMP columns compare ISO params natively.
      const gteClause = this.isPostgres() ? 'timestamp >= ?' : 'datetime(timestamp) >= datetime(?)';
      const lteClause = this.isPostgres() ? 'timestamp <= ?' : 'datetime(timestamp) <= datetime(?)';

      if (filter.botName) {
        conditions.push('botName = ?');
        params.push(filter.botName);
      }
      if (filter.provider) {
        conditions.push('provider = ?');
        params.push(filter.provider);
      }
      if (filter.startTime) {
        conditions.push(gteClause);
        params.push(filter.startTime.toISOString());
      }
      if (filter.endTime) {
        conditions.push(lteClause);
        params.push(filter.endTime.toISOString());
      }

      const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
      const limit = typeof filter.limit === 'number' && filter.limit >= 0 ? filter.limit : 100;
      const offset = typeof filter.offset === 'number' && filter.offset >= 0 ? filter.offset : 0;

      const rows = await db.all(
        `SELECT id, botName, tokensUsed, latencyMs, provider, status, errorMessage, timestamp
         FROM inference_logs${where}
         ORDER BY timestamp DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return rows.map((row) => ({
        id: row.id as number | string,
        botName: row.botName as string,
        tokensUsed: (row.tokensUsed as number | null) ?? null,
        latencyMs: (row.latencyMs as number | null) ?? null,
        provider: (row.provider as string | null) ?? null,
        status: (row.status as string) ?? 'unknown',
        errorMessage: (row.errorMessage as string | null) ?? null,
        timestamp: new Date(row.timestamp as string | number | Date).toISOString(),
      }));
    } catch (error) {
      debug('Error reading inference logs:', error);
      return [];
    }
  }
}
