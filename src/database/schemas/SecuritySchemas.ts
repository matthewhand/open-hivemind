import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import type { ISchemaModule } from './ISchemaModule';

export class SecuritySchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // User permissions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        permission TEXT NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES sessions (user_id) ON DELETE CASCADE
      )
    `
    );

    // Bot rate limiting table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_rate_limits (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        requests_count INTEGER DEFAULT 0,
        reset_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot security events table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_security_events (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        description TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot API keys table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_api_keys (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        api_key TEXT NOT NULL,
        description TEXT,
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // User permissions indexes
      'CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission)',

      // Bot rate limits indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_bot_id ON bot_rate_limits(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_user_id ON bot_rate_limits(user_id)',

      // Bot security events indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_bot_id ON bot_security_events(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_event_type ON bot_security_events(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_severity ON bot_security_events(severity)',

      // Bot API keys indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_api_keys_bot_id ON bot_api_keys(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_keys_api_key ON bot_api_keys(api_key)',
    ];

    for (const indexSql of indexes) {
      await this.createIndex(db, indexSql);
    }
  }

  private async createTable(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (err: any) {
      Logger.error(`Error creating table: ${err.message}`);
      throw err;
    }
  }

  private async createIndex(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (err: any) {
      Logger.error(`Error creating index: ${err.message}`);
      // Don't reject on index creation error as it might already exist
    }
  }
}
