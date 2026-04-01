import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Analytics tables: bot_sentiment_analysis, bot_entity_extraction,
 * bot_intent_classification, bot_conversation_flows,
 * bot_conversation_flow_executions, bot_user_profiles,
 * bot_user_preferences, bot_user_tags
 */
export class AnalyticsSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Bot sentiment analysis table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_sentiment_analysis (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        sentiment_score REAL,
        sentiment_label TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot entity extraction table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_entity_extraction (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        entity_type TEXT,
        entity_value TEXT,
        confidence_score REAL,
        extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot intent classification table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_intent_classification (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        intent_name TEXT,
        confidence_score REAL,
        classified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot conversation flows table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_conversation_flows (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        flow_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot conversation flow executions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_conversation_flow_executions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        flow_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        current_step TEXT,
        context_data TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (flow_id) REFERENCES bot_conversation_flows (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user profiles table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_profiles (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        profile_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user preferences table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_preferences (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        preference_key TEXT NOT NULL,
        preference_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user tags table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_tags (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Bot sentiment analysis indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_sentiment_analysis_bot_id ON bot_sentiment_analysis(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_sentiment_analysis_message_id ON bot_sentiment_analysis(message_id)',

      // Bot entity extraction indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_entity_extraction_bot_id ON bot_entity_extraction(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_entity_extraction_message_id ON bot_entity_extraction(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_entity_extraction_entity_type ON bot_entity_extraction(entity_type)',

      // Bot intent classification indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_intent_classification_bot_id ON bot_intent_classification(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_intent_classification_message_id ON bot_intent_classification(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_intent_classification_intent_name ON bot_intent_classification(intent_name)',

      // Bot conversation flows indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flows_bot_id ON bot_conversation_flows(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flows_flow_name ON bot_conversation_flows(flow_name)',

      // Bot conversation flow executions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flow_executions_bot_id ON bot_conversation_flow_executions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flow_executions_flow_id ON bot_conversation_flow_executions(flow_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flow_executions_status ON bot_conversation_flow_executions(status)',

      // Bot user profiles indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_profiles_bot_id ON bot_user_profiles(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_profiles_user_id ON bot_user_profiles(user_id)',

      // Bot user preferences indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_preferences_bot_id ON bot_user_preferences(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_preferences_user_id ON bot_user_preferences(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_preferences_preference_key ON bot_user_preferences(preference_key)',

      // Bot user tags indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_tags_bot_id ON bot_user_tags(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_tags_user_id ON bot_user_tags(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_tags_tag_name ON bot_user_tags(tag_name)',
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
