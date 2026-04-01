import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Operations tables: channel_routing, bot_scheduling, bot_feedback,
 * bot_training_data, bot_knowledge_base, bot_user_sessions,
 * bot_conversation_history, bot_rate_limits, bot_security_events
 */
export class OperationsSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Channel routing table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS channel_routing (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        bot_id TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot scheduling table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_scheduling (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_config TEXT NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        next_run DATETIME,
        last_run DATETIME,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot feedback table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_feedback (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        feedback_text TEXT,
        rating INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot training data table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_training_data (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        input_text TEXT NOT NULL,
        output_text TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot knowledge base table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_knowledge_base (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user sessions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_sessions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_end DATETIME,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot conversation history table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_conversation_history (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
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
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Channel routing indexes
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_channel_id ON channel_routing(channel_id)',
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_bot_id ON channel_routing(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_priority ON channel_routing(priority)',
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_enabled ON channel_routing(enabled)',

      // Bot scheduling indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_bot_id ON bot_scheduling(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_status ON bot_scheduling(status)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_next_run ON bot_scheduling(next_run)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_last_run ON bot_scheduling(last_run)',

      // Bot feedback indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_bot_id ON bot_feedback(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_user_id ON bot_feedback(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_rating ON bot_feedback(rating)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_created_at ON bot_feedback(created_at)',

      // Bot training data indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_training_data_bot_id ON bot_training_data(bot_id)',

      // Bot knowledge base indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_knowledge_base_bot_id ON bot_knowledge_base(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_knowledge_base_title ON bot_knowledge_base(title)',

      // Bot user sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_bot_id ON bot_user_sessions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_user_id ON bot_user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_status ON bot_user_sessions(status)',

      // Bot conversation history indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_bot_id ON bot_conversation_history(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_user_id ON bot_conversation_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_timestamp ON bot_conversation_history(timestamp)',

      // Bot rate limits indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_bot_id ON bot_rate_limits(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_user_id ON bot_rate_limits(user_id)',

      // Bot security events indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_bot_id ON bot_security_events(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_event_type ON bot_security_events(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_severity ON bot_security_events(severity)',
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
    }
  }
}
