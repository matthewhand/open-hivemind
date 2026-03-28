import { Database } from 'sqlite';
import Debug from 'debug';
import { BotMetrics } from '../DatabaseManager';

const debug = Debug('app:BotRepository');

export class BotRepository {
  private db: Database | null;
  private isConnected: () => boolean;

  constructor(db: Database | null, isConnected: () => boolean) {
    this.db = db;
    this.isConnected = isConnected;
  }

  setDb(db: Database | null) {
    this.db = db;
  }

  private ensureConnected(): void {
    if (!this.db || !this.isConnected()) {
      throw new Error('Database not connected');
    }
  }

  async updateBotMetrics(metrics: BotMetrics): Promise<void> {
    this.ensureConnected();

    if (metrics.messagesSent !== undefined && (metrics.messagesSent < 0 || isNaN(metrics.messagesSent))) {
      throw new RangeError('messagesSent cannot be negative or NaN');
    }
    if (metrics.messagesReceived !== undefined && (metrics.messagesReceived < 0 || isNaN(metrics.messagesReceived))) {
      throw new RangeError('messagesReceived cannot be negative or NaN');
    }
    if (metrics.conversationsHandled !== undefined && (metrics.conversationsHandled < 0 || isNaN(metrics.conversationsHandled))) {
      throw new RangeError('conversationsHandled cannot be negative or NaN');
    }
    if (metrics.averageResponseTime !== undefined && (metrics.averageResponseTime < 0 || isNaN(metrics.averageResponseTime))) {
      throw new RangeError('averageResponseTime cannot be negative or NaN');
    }

    try {
      await this.db!.run(
        `
        INSERT OR REPLACE INTO bot_metrics (
          botName, messagesSent, messagesReceived, conversationsHandled,
          averageResponseTime, lastActivity, provider, updated_at, tenantId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `,
        [
          metrics.botName,
          metrics.messagesSent,
          metrics.messagesReceived,
          metrics.conversationsHandled,
          metrics.averageResponseTime,
          metrics.lastActivity.toISOString(),
          metrics.provider,
          (metrics as any).tenantId || null
        ]
      );

      debug(`Bot metrics updated for: ${metrics.botName}`);
    } catch (error) {
      debug('Error updating bot metrics:', error);
      throw new Error(`Failed to update bot metrics: ${error}`);
    }
  }

  async getBotMetrics(botName?: string): Promise<BotMetrics[]> {
    this.ensureConnected();

    try {
      let query = `SELECT * FROM bot_metrics`;
      const params: any[] = [];

      if (botName) {
        query += ` WHERE botName = ?`;
        params.push(botName);
      }

      query += ` ORDER BY updated_at DESC`;

      const rows = await this.db!.all(query, params);

      return rows.map((row) => ({
        id: row.id,
        botName: row.botName,
        messagesSent: row.messagesSent,
        messagesReceived: row.messagesReceived,
        conversationsHandled: row.conversationsHandled,
        averageResponseTime: row.averageResponseTime,
        lastActivity: new Date(row.lastActivity),
        provider: row.provider,
        tenantId: row.tenantId
      }));
    } catch (error) {
      debug('Error retrieving bot metrics:', error);
      throw new Error(`Failed to retrieve bot metrics: ${error}`);
    }
  }
}
