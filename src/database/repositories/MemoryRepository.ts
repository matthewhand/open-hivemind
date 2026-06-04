import Debug from 'debug';
import { type IDatabase, type MemoryRecord } from '../types';

const debug = Debug('app:MemoryRepository');

export class MemoryRepository {
  constructor(
    private getDb: () => IDatabase | null,
    private isConnected: () => boolean,
    private isPostgres: () => boolean
  ) {}

  async addMemory(record: MemoryRecord): Promise<number | string> {
    if (!this.isConnected()) return 0;
    const db = this.getDb();
    if (!db) return 0;

    try {
      const isPg = this.isPostgres();
      const sql = `
        INSERT INTO memories 
        (content, metadata, userId, agentId, sessionId, embedding) 
        VALUES (?, ?, ?, ?, ?, ${isPg ? '?::vector' : '?'})
      `;

      const embeddingValue = record.embedding
        ? isPg
          ? `[${record.embedding.join(',')}]`
          : JSON.stringify(record.embedding)
        : null;

      const params = [
        record.content,
        record.metadata ? JSON.stringify(record.metadata) : null,
        record.userId || null,
        record.agentId || null,
        record.sessionId || null,
        embeddingValue,
      ];

      const result = await db.run(sql, params);
      return result.lastID;
    } catch (error) {
      debug('Error adding memory:', error);
      throw error;
    }
  }

  async searchMemories(
    embedding: number[],
    options: { limit?: number; userId?: string; agentId?: string } = {}
  ): Promise<(MemoryRecord & { score: number })[]> {
    if (!this.isConnected()) return [];
    const db = this.getDb();
    if (!db) return [];

    const isPg = this.isPostgres();
    const limit = options.limit || 10;

    try {
      if (isPg) {
        const vectorStr = `[${embedding.join(',')}]`;
        let sql = `
          SELECT *, 1 - (embedding <=> ?::vector) as score
          FROM memories
          WHERE 1=1
        `;
        const params: any[] = [vectorStr];
        if (options.userId) {
          sql += ` AND userId = ?`;
          params.push(options.userId);
        }
        if (options.agentId) {
          sql += ` AND agentId = ?`;
          params.push(options.agentId);
        }
        sql += ` ORDER BY embedding <=> ?::vector LIMIT ?`;
        params.push(vectorStr);
        params.push(limit);

        const rows = await db.all(sql, params);
        return rows.map((row) => ({
          ...row,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
          score: parseFloat(row.score),
        }));
      } else {
        // Fallback for SQLite: JS-side similarity
        debug('Performing JS-side vector similarity search for SQLite');
        let sql = `SELECT * FROM memories WHERE 1=1`;
        const params: any[] = [];
        if (options.userId) {
          sql += ` AND userId = ?`;
          params.push(options.userId);
        }
        if (options.agentId) {
          sql += ` AND agentId = ?`;
          params.push(options.agentId);
        }

        const rows = await db.all(sql, params);

        const scored = rows
          .map((row) => {
            const rowEmbedding =
              typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
            if (!rowEmbedding || !Array.isArray(rowEmbedding)) return null;

            // Cosine Similarity
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < embedding.length; i++) {
              dotProduct += embedding[i] * rowEmbedding[i];
              normA += embedding[i] * embedding[i];
              normB += rowEmbedding[i] * rowEmbedding[i];
            }
            const score = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

            return {
              ...row,
              metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
              score,
            };
          })
          .filter((r) => r !== null)
          .sort((a, b) => b!.score - a!.score)
          .slice(0, limit);

        return scored as (MemoryRecord & { score: number })[];
      }
    } catch (error) {
      debug('Error searching memories:', error);
      return [];
    }
  }

  async getMemories(
    options: { limit?: number; userId?: string; agentId?: string } = {}
  ): Promise<MemoryRecord[]> {
    if (!this.isConnected()) return [];
    const db = this.getDb();
    if (!db) return [];

    try {
      const limit = options.limit || 50;
      let sql = `SELECT * FROM memories WHERE 1=1`;
      const params: any[] = [];

      if (options.userId) {
        sql += ` AND userId = ?`;
        params.push(options.userId);
      }
      if (options.agentId) {
        sql += ` AND agentId = ?`;
        params.push(options.agentId);
      }

      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);

      const rows = await db.all(sql, params);
      return rows.map((row) => ({
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));
    } catch (error) {
      debug('Error getting memories:', error);
      return [];
    }
  }

  async getMemoryById(id: string | number): Promise<MemoryRecord | null> {
    if (!this.isConnected()) return null;
    const db = this.getDb();
    if (!db) return null;

    try {
      const row = await db.get('SELECT * FROM memories WHERE id = ?', [id]);
      if (!row) return null;
      return {
        ...row,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      };
    } catch (error) {
      debug('Error getting memory by id:', error);
      return null;
    }
  }

  /**
   * Update an existing memory row in place, preserving its id and created_at.
   *
   * Only the fields present in `fields` are written, so callers can update the
   * content (and its re-computed embedding) without clobbering metadata, or
   * vice-versa. Embeddings are encoded the same way as in {@link addMemory}
   * (pgvector literal for Postgres, JSON string for SQLite).
   *
   * @returns true when a row was updated, false when no row matched or no
   *          updatable field was supplied.
   */
  async updateMemory(
    id: string | number,
    fields: { content?: string; metadata?: Record<string, unknown>; embedding?: number[] }
  ): Promise<boolean> {
    if (!this.isConnected()) return false;
    const db = this.getDb();
    if (!db) return false;

    try {
      const isPg = this.isPostgres();
      const sets: string[] = [];
      const params: any[] = [];

      if (fields.content !== undefined) {
        sets.push('content = ?');
        params.push(fields.content);
      }
      if (fields.metadata !== undefined) {
        sets.push('metadata = ?');
        params.push(fields.metadata ? JSON.stringify(fields.metadata) : null);
      }
      if (fields.embedding !== undefined) {
        sets.push(`embedding = ${isPg ? '?::vector' : '?'}`);
        params.push(isPg ? `[${fields.embedding.join(',')}]` : JSON.stringify(fields.embedding));
      }

      // Nothing to update — avoid issuing an empty SET clause.
      if (sets.length === 0) return false;

      params.push(id);
      const result = await db.run(
        `UPDATE memories SET ${sets.join(', ')} WHERE id = ?`,
        params
      );
      return (result.changes ?? 0) > 0;
    } catch (error) {
      debug('Error updating memory:', error);
      throw error;
    }
  }

  async deleteMemory(id: string | number): Promise<boolean> {
    if (!this.isConnected()) return false;
    const db = this.getDb();
    if (!db) return false;

    try {
      const result = await db.run('DELETE FROM memories WHERE id = ?', [id]);
      return (result.changes ?? 0) > 0;
    } catch (error) {
      debug('Error deleting memory:', error);
      return false;
    }
  }

  async deleteAll(options: { userId?: string; agentId?: string } = {}): Promise<void> {
    if (!this.isConnected()) return;
    const db = this.getDb();
    if (!db) return;

    try {
      let sql = `DELETE FROM memories WHERE 1=1`;
      const params: any[] = [];

      if (options.userId) {
        sql += ` AND userId = ?`;
        params.push(options.userId);
      }
      if (options.agentId) {
        sql += ` AND agentId = ?`;
        params.push(options.agentId);
      }

      await db.run(sql, params);
    } catch (error) {
      debug('Error deleting all memories:', error);
    }
  }

  /**
   * Evict (prune) stored memories based on a retention policy.
   *
   * This is opt-in and safe by design: if neither `olderThanDays` nor
   * `maxCount` is supplied (or both are <= 0), the method is a no-op and
   * deletes nothing. This prevents accidental data loss when called without
   * an explicit policy.
   *
   * Two independent rules may be applied (both run when provided):
   *  - TTL: delete memories whose `created_at` is older than `olderThanDays`.
   *  - Max count: keep only the newest `maxCount` memories, deleting the rest.
   *
   * Both rules respect the optional `userId` / `agentId` scope, so a policy
   * can be applied globally or per-user / per-agent.
   *
   * @returns The total number of memory rows deleted.
   */
  async evictMemories(
    options: {
      olderThanDays?: number;
      maxCount?: number;
      userId?: string;
      agentId?: string;
    } = {}
  ): Promise<number> {
    if (!this.isConnected()) return 0;
    const db = this.getDb();
    if (!db) return 0;

    const { olderThanDays, maxCount, userId, agentId } = options;

    const hasTtl = typeof olderThanDays === 'number' && olderThanDays > 0;
    const hasMaxCount = typeof maxCount === 'number' && maxCount > 0;

    // Safe by default: nothing to do without an explicit, positive policy.
    if (!hasTtl && !hasMaxCount) {
      return 0;
    }

    const isPg = this.isPostgres();
    let deleted = 0;

    // Build the optional scope filter once.
    const buildScope = (): { clause: string; params: any[] } => {
      let clause = '';
      const params: any[] = [];
      if (userId) {
        clause += ` AND userId = ?`;
        params.push(userId);
      }
      if (agentId) {
        clause += ` AND agentId = ?`;
        params.push(agentId);
      }
      return { clause, params };
    };

    try {
      // Rule 1: TTL — delete anything older than the cutoff.
      if (hasTtl) {
        const { clause, params } = buildScope();
        const cutoffExpr = isPg
          ? `NOW() - INTERVAL '${olderThanDays} days'`
          : `datetime('now', '-${olderThanDays} days')`;
        const sql = `DELETE FROM memories WHERE created_at < ${cutoffExpr}${clause}`;
        const result = await db.run(sql, params);
        deleted += result.changes ?? 0;
      }

      // Rule 2: Max count — keep only the newest `maxCount` rows in scope.
      if (hasMaxCount) {
        const { clause, params } = buildScope();
        // Find the id of the (maxCount)th newest row; delete everything older.
        const cutoffRow = await db.get(
          `SELECT id FROM memories WHERE 1=1${clause} ORDER BY id DESC LIMIT 1 OFFSET ?`,
          [...params, maxCount as number]
        );
        if (cutoffRow && cutoffRow.id != null) {
          const result = await db.run(
            `DELETE FROM memories WHERE id <= ?${clause}`,
            [cutoffRow.id, ...params]
          );
          deleted += result.changes ?? 0;
        }
      }
    } catch (error) {
      debug('Error evicting memories:', error);
      return deleted;
    }

    debug('Evicted %d memories (ttl=%o, maxCount=%o)', deleted, olderThanDays, maxCount);
    return deleted;
  }
}
