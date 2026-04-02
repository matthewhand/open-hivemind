import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

export class ActivitySchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS message_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        channel_id TEXT,
        user_id TEXT,
        message TEXT,
        response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_audit_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        old_values TEXT,
        new_values TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_error_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        severity TEXT DEFAULT 'medium',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_bot_id ON activity_logs(bot_id)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)'
    );

    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_message_logs_bot_id ON message_logs(bot_id)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_message_logs_user_id ON message_logs(user_id)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp ON message_logs(timestamp)'
    );

    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_bot_id ON bot_audit_logs(bot_id)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_user_id ON bot_audit_logs(user_id)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_timestamp ON bot_audit_logs(timestamp)'
    );

    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_bot_id ON bot_error_logs(bot_id)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_severity ON bot_error_logs(severity)'
    );
    await this.createIndex(
      db,
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_timestamp ON bot_error_logs(timestamp)'
    );
  }

  private async createTable(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (error) {
      Logger.error(
        `Error creating table: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  private async createIndex(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (error) {
      Logger.error(
        `Error creating index: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }
}
