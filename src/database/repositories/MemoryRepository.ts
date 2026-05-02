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
          .filter((r): r is MemoryRecord & { score: number } => r !== null)
          .sort((a, b) => b.score - a.score)
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
}
