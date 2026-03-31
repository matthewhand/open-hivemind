import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import type { ISchemaModule } from './ISchemaModule';

export class BotSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Bot configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot-to-user mappings table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_mappings (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES sessions (user_id) ON DELETE CASCADE,
        UNIQUE(bot_id, user_id)
      )
    `
    );

    // Bot templates table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Bot versions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_versions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        version_number TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot approvals table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_approvals (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        approver_id TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Bot configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_configs_bot_id ON bot_configs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_configs_config_key ON bot_configs(config_key)',

      // Bot-to-user mappings indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_mappings_bot_id ON bot_user_mappings(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_mappings_user_id ON bot_user_mappings(user_id)',

      // Bot templates indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_templates_name ON bot_templates(name)',

      // Bot versions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_versions_bot_id ON bot_versions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_versions_version_number ON bot_versions(version_number)',

      // Bot approvals indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_bot_id ON bot_approvals(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_approver_id ON bot_approvals(approver_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_status ON bot_approvals(status)',

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
