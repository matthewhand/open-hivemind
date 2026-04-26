import Debug from 'debug';
import databaseConfig from '../../config/databaseConfig';
import type { IDatabase as Database } from '../types';

const debug = Debug('app:ActivityRepository');

export interface ActivityLog {
  id?: number;
  bot_id?: string;
  action: string;
  details?: string;
  metadata?: string;
  timestamp?: Date;
}

export class ActivityRepository {
  constructor(
    private getDb: () => Database | null,
    private isConnected: () => boolean
  ) {}

  async logActivity(activity: ActivityLog): Promise<number | string> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return 0;
    }

    try {
      const isPg = databaseConfig.get('DATABASE_TYPE') === 'postgres';
      const result = await db.run(
        `INSERT INTO activity_logs (bot_id, action, details, metadata) VALUES (?, ?, ?, ?)`,
        [
          activity.bot_id || null,
          activity.action,
          activity.details || null,
          activity.metadata || null,
        ]
      );
      return result.lastID;
    } catch (error) {
      debug('Error logging activity:', error);
      return 0;
    }
  }

  async logMessageActivity(log: {
    bot_id?: string;
    channel_id: string;
    user_id: string;
    message: string;
    response?: string;
  }): Promise<number | string> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return 0;
    }

    try {
      const isPg = databaseConfig.get('DATABASE_TYPE') === 'postgres';
      const result = await db.run(
        `INSERT INTO message_logs (bot_id, channel_id, user_id, message, response) VALUES (?, ?, ?, ?, ?)`,
        [log.bot_id || null, log.channel_id, log.user_id, log.message, log.response || null]
      );
      return result.lastID;
    } catch (error) {
      debug('Error logging message activity:', error);
      return 0;
    }
  }

  async logAudit(audit: {
    bot_id: string;
    action: string;
    user_id?: string;
    old_values?: string;
    new_values?: string;
  }): Promise<number | string> {
    const db = this.getDb();
    if (!db || !this.isConnected()) {
      return 0;
    }

    try {
      const isPg = databaseConfig.get('DATABASE_TYPE') === 'postgres';
      const result = await db.run(
        `INSERT INTO bot_audit_logs (bot_id, action, user_id, old_values, new_values) VALUES (?, ?, ?, ?, ?)`,
        [audit.bot_id, audit.action, audit.user_id || null, audit.old_values || null, audit.new_values || null]
      );
      return result.lastID;
    } catch (error) {
      debug('Error logging audit:', error);
      return 0;
    }
  }
}
