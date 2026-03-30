import Debug from 'debug';
import type { Database } from 'sqlite';
import type { Anomaly } from './types';

const debug = Debug('app:AnomalyRepository');

/**
 * Repository responsible for anomaly CRUD operations.
 */
export class AnomalyRepository {
  constructor(
    private getDb: () => Database | null,
    private isConnected: () => boolean
  ) {}

  async storeAnomaly(anomaly: Anomaly): Promise<void> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      debug('Database not connected, anomaly not stored');
      return;
    }

    try {
      await db.run(
        `
        INSERT OR REPLACE INTO anomalies (
          id, timestamp, metric, value, expectedMean, standardDeviation,
          zScore, threshold, severity, explanation, resolved, tenantId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          anomaly.id,
          anomaly.timestamp,
          anomaly.metric,
          anomaly.value,
          anomaly.expectedMean,
          anomaly.standardDeviation,
          anomaly.zScore,
          anomaly.threshold,
          anomaly.severity,
          anomaly.explanation,
          anomaly.resolved ? 1 : 0,
          anomaly.tenantId,
        ]
      );

      debug(`Anomaly stored: ${anomaly.id}`);
    } catch (error) {
      debug('Error storing anomaly:', error);
      throw error;
    }
  }

  private mapRowToAnomaly(row: Record<string, any>): Anomaly {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      metric: row.metric,
      value: row.value,
      expectedMean: row.expectedMean,
      standardDeviation: row.standardDeviation,
      zScore: row.zScore,
      threshold: row.threshold,
      severity: row.severity,
      explanation: row.explanation,
      resolved: !!row.resolved,
      tenantId: row.tenantId,
    };
  }

  async getAnomalies(tenantId?: string): Promise<Anomaly[]> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return [];
    }

    try {
      let query = `SELECT * FROM anomalies`;
      const params: (string | number | boolean | null)[] = [];

      if (tenantId) {
        query += ` WHERE tenantId = ?`;
        params.push(tenantId);
      }

      query += ` ORDER BY timestamp DESC`;

      const rows = await db.all(query, params);

      return rows.map((row) => this.mapRowToAnomaly(row));
    } catch (error) {
      debug('Error getting anomalies:', error);
      throw error;
    }
  }

  async getActiveAnomalies(tenantId?: string): Promise<Anomaly[]> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return [];
    }

    try {
      let query = `SELECT * FROM anomalies WHERE resolved = 0`;
      const params: (string | number | boolean | null)[] = [];

      if (tenantId) {
        query += ` AND tenantId = ?`;
        params.push(tenantId);
      }

      query += ` ORDER BY timestamp DESC`;

      const rows = await db.all(query, params);

      return rows.map((row) => this.mapRowToAnomaly(row));
    } catch (error) {
      debug('Error getting active anomalies:', error);
      throw error;
    }
  }

  async resolveAnomaly(id: string, tenantId?: string): Promise<boolean> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return false;
    }

    try {
      let query = `UPDATE anomalies SET resolved = 1 WHERE id = ?`;
      const params: (string | number | boolean | null)[] = [id];

      if (tenantId) {
        query += ` AND tenantId = ?`;
        params.push(tenantId);
      }

      const result = await db.run(query, params);

      return (result.changes ?? 0) > 0;
    } catch (error) {
      debug('Error resolving anomaly:', error);
      throw error;
    }
  }
}
