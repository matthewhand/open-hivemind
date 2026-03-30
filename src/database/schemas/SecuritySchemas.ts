import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { ISchemaModule } from './ISchemaModule';

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

    // Bot privacy compliance table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_privacy_compliance (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        compliance_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        details TEXT,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot consent management table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_consent_management (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        granted BOOLEAN DEFAULT 0,
        granted_at DATETIME,
        revoked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data masking rules table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_masking_rules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        column_name TEXT NOT NULL,
        masking_type TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data classification table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_classification (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        column_name TEXT NOT NULL,
        classification_level TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data retention policies table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_retention_policies (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        retention_period_days INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    Logger.info('Security schemas created successfully');
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

      // Bot environment variables indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_environment_vars_bot_id ON bot_environment_vars(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_environment_vars_var_name ON bot_environment_vars(var_name)',

      // Bot privacy compliance indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_privacy_compliance_bot_id ON bot_privacy_compliance(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_privacy_compliance_compliance_type ON bot_privacy_compliance(compliance_type)',

      // Bot consent management indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_bot_id ON bot_consent_management(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_user_id ON bot_consent_management(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_consent_type ON bot_consent_management(consent_type)',

      // Bot data masking rules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_masking_rules_bot_id ON bot_data_masking_rules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_masking_rules_table_name ON bot_data_masking_rules(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_masking_rules_column_name ON bot_data_masking_rules(column_name)',

      // Bot data classification indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_classification_bot_id ON bot_data_classification(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_classification_table_name ON bot_data_classification(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_classification_column_name ON bot_data_classification(column_name)',

      // Bot data retention policies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_bot_id ON bot_data_retention_policies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_data_type ON bot_data_retention_policies(data_type)',
    ];

    for (const sql of indexes) {
      await this.createIndex(db, sql);
    }

    Logger.info('Security schema indexes created successfully');
  }

  getTableNames(): string[] {
    return [
      'user_permissions',
      'bot_rate_limits',
      'bot_security_events',
      'bot_api_keys',
      'bot_environment_vars',
      'bot_privacy_compliance',
      'bot_consent_management',
      'bot_data_masking_rules',
      'bot_data_classification',
      'bot_data_retention_policies'
    ];
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
