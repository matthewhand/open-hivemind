import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Integration tables: bot_webhook_configs, bot_integrations, bot_notifications,
 * bot_custom_fields, bot_feature_flags, bot_data_exports, bot_data_imports,
 * bot_backup_configs, bot_dependencies, bot_config_history,
 * bot_environment_vars, bot_api_keys
 */
export class IntegrationSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Bot webhook configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_webhook_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        headers TEXT,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot integrations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_integrations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        integration_name TEXT NOT NULL,
        config TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot notifications table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_notifications (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        user_id TEXT,
        notification_type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'unread',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot custom fields table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_custom_fields (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_value TEXT,
        field_type TEXT DEFAULT 'text',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot feature flags table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_feature_flags (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        feature_name TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data exports table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_exports (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        export_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data imports table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_imports (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        import_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot backup configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_backup_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot dependencies table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_dependencies (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        dependency_name TEXT NOT NULL,
        version TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot configuration history table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_config_history (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config TEXT NOT NULL,
        changed_by TEXT,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot environment variables table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_environment_vars (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        var_name TEXT NOT NULL,
        var_value TEXT,
        encrypted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
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
      // Bot webhook configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_webhook_configs_bot_id ON bot_webhook_configs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_webhook_configs_event_type ON bot_webhook_configs(event_type)',

      // Bot integrations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_integrations_bot_id ON bot_integrations(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_integrations_integration_name ON bot_integrations(integration_name)',

      // Bot notifications indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_notifications_bot_id ON bot_notifications(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_notifications_user_id ON bot_notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_notifications_status ON bot_notifications(status)',

      // Bot custom fields indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_custom_fields_bot_id ON bot_custom_fields(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_custom_fields_field_name ON bot_custom_fields(field_name)',

      // Bot feature flags indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_feature_flags_bot_id ON bot_feature_flags(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feature_flags_feature_name ON bot_feature_flags(feature_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feature_flags_enabled ON bot_feature_flags(enabled)',

      // Bot data exports indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_exports_bot_id ON bot_data_exports(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_exports_status ON bot_data_exports(status)',

      // Bot data imports indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_imports_bot_id ON bot_data_imports(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_imports_status ON bot_data_imports(status)',

      // Bot backup configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_configs_bot_id ON bot_backup_configs(bot_id)',

      // Bot dependencies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_dependencies_bot_id ON bot_dependencies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_dependencies_dependency_name ON bot_dependencies(dependency_name)',

      // Bot configuration history indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_config_history_bot_id ON bot_config_history(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_config_history_created_at ON bot_config_history(created_at)',

      // Bot environment variables indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_environment_vars_bot_id ON bot_environment_vars(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_environment_vars_var_name ON bot_environment_vars(var_name)',

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
    }
  }
}
