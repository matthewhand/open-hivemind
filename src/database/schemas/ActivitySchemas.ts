import { Logger } from '@common/logger';
import type { IDatabase as Database } from '../types';
import { type ISchemaModule } from './ISchemaModule';

export class ActivitySchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    const isPostgres = (db as any).constructor.name === 'PostgresWrapper' || !!(db as any).pool;
    const pk_auto = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const datetime_type = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    const default_now = isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id ${pk_auto},
        bot_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        metadata TEXT,
        timestamp ${datetime_type} DEFAULT ${default_now},
        FOREIGN KEY (bot_id) REFERENCES bot_configurations (id) ON DELETE SET NULL
      )
    `
    );

    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS message_logs (
        id ${pk_auto},
        bot_id INTEGER,
        channel_id TEXT,
        user_id TEXT,
        message TEXT,
        response TEXT,
        timestamp ${datetime_type} DEFAULT ${default_now},
        FOREIGN KEY (bot_id) REFERENCES bot_configurations (id) ON DELETE SET NULL
      )
    `
    );

    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_audit_logs (
        id ${pk_auto},
        bot_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        old_values TEXT,
        new_values TEXT,
        timestamp ${datetime_type} DEFAULT ${default_now},
        FOREIGN KEY (bot_id) REFERENCES bot_configurations (id) ON DELETE CASCADE
      )
    `
    );

    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_error_logs (
        id ${pk_auto},
        bot_id INTEGER,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        severity TEXT DEFAULT 'medium',
        timestamp ${datetime_type} DEFAULT ${default_now},
        FOREIGN KEY (bot_id) REFERENCES bot_configurations (id) ON DELETE SET NULL
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

  getTableNames(): string[] {
    return ['activity_logs', 'message_logs', 'bot_audit_logs', 'bot_error_logs'];
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
