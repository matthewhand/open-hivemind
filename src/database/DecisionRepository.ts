import Debug from 'debug';
import type { SQLiteWrapper as Database } from './sqliteWrapper';
import type { DecisionRecord } from './types';

const debug = Debug('app:DecisionRepository');

/**
 * Repository responsible for persisting bot orchestration decisions.
 * Implements a capped collection behavior (last 1000 items).
 */
export class DecisionRepository {
  constructor(
    private getDb: () => Database | null,
    private isConnected: () => boolean
  ) {}

  /**
   * Save a decision to the database and enforce the 1000-row cap.
   */
  async saveDecision(decision: Omit<DecisionRecord, 'id' | 'timestamp'>): Promise<void> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();

      // 1. Insert the new decision
      await db.run(
        `INSERT INTO decisions (botName, shouldReply, reason, probabilityRoll, threshold, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          decision.botName,
          decision.shouldReply ? 1 : 0,
          decision.reason,
          decision.probabilityRoll,
          decision.threshold,
          timestamp,
        ]
      );

      // 2. Enforce the 1000-row cap
      await db.run(`
        DELETE FROM decisions 
        WHERE id NOT IN (
          SELECT id FROM decisions 
          ORDER BY id DESC 
          LIMIT 1000
        )
      `);

      debug(`Decision saved for bot: ${decision.botName}`);
    } catch (error) {
      debug('Error saving orchestration decision:', error);
    }
  }

  /**
   * Retrieve recent decisions.
   */
  async getRecentDecisions(limit = 100): Promise<any[]> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return [];
    }

    try {
      const rows = await db.all(`SELECT * FROM decisions ORDER BY timestamp DESC LIMIT ?`, [limit]);

      return rows.map((row: any) => ({
        id: row.id,
        botName: row.botName,
        shouldReply: Boolean(row.shouldReply),
        reason: row.reason,
        probabilityRoll: row.probabilityRoll,
        threshold: row.threshold,
        timestamp: row.timestamp ? new Date(row.timestamp) : undefined,
      }));
    } catch (error) {
      debug('Error retrieving recent decisions:', error);
      return [];
    }
  }
}
