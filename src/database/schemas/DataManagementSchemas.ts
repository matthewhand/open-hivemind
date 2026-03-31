import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Data management tables: bot_data_sources, bot_data_transformations,
 * bot_data_validation_rules, bot_data_lineage, bot_data_catalog,
 * bot_backup_schedules, bot_restore_operations, bot_data_masking_rules,
 * bot_data_classification, bot_data_export_requests, bot_data_import_requests,
 * bot_data_purging_schedules, bot_data_archival_configs,
 * bot_data_archival_operations
 */
export class DataManagementSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Bot data sources table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_sources (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        connection_config TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data transformations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_transformations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        transformation_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data validation rules table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_validation_rules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        validation_logic TEXT NOT NULL,
        error_message TEXT,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data lineage table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_lineage (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        source_table TEXT NOT NULL,
        target_table TEXT NOT NULL,
        transformation_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (transformation_id) REFERENCES bot_data_transformations (id) ON DELETE SET NULL
      )
    `
    );

    // Bot data catalog table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_catalog (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        column_name TEXT NOT NULL,
        data_type TEXT,
        description TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot backup schedules table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_backup_schedules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot restore operations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_restore_operations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        backup_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
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

    // Bot data export requests table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_export_requests (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        export_format TEXT NOT NULL,
        export_config TEXT,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data import requests table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_import_requests (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        import_format TEXT NOT NULL,
        import_config TEXT,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data purging schedules table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_purging_schedules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        data_type TEXT NOT NULL,
        retention_period_days INTEGER NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data archival configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_archival_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config_name TEXT NOT NULL,
        archival_criteria TEXT NOT NULL,
        target_location TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data archival operations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_archival_operations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        records_archived INTEGER DEFAULT 0,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (config_id) REFERENCES bot_data_archival_configs (id) ON DELETE CASCADE
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Bot data sources indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_sources_bot_id ON bot_data_sources(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_sources_source_name ON bot_data_sources(source_name)',

      // Bot data transformations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_transformations_bot_id ON bot_data_transformations(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_transformations_transformation_name ON bot_data_transformations(transformation_name)',

      // Bot data validation rules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_rules_bot_id ON bot_data_validation_rules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_rules_rule_name ON bot_data_validation_rules(rule_name)',

      // Bot data lineage indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_lineage_bot_id ON bot_data_lineage(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_lineage_source_table ON bot_data_lineage(source_table)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_lineage_target_table ON bot_data_lineage(target_table)',

      // Bot data catalog indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_catalog_bot_id ON bot_data_catalog(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_catalog_table_name ON bot_data_catalog(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_catalog_column_name ON bot_data_catalog(column_name)',

      // Bot backup schedules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_schedules_bot_id ON bot_backup_schedules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_schedules_schedule_name ON bot_backup_schedules(schedule_name)',

      // Bot restore operations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_restore_operations_bot_id ON bot_restore_operations(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_restore_operations_backup_id ON bot_restore_operations(backup_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_restore_operations_status ON bot_restore_operations(status)',

      // Bot data masking rules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_masking_rules_bot_id ON bot_data_masking_rules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_masking_rules_table_name ON bot_data_masking_rules(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_masking_rules_column_name ON bot_data_masking_rules(column_name)',

      // Bot data classification indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_classification_bot_id ON bot_data_classification(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_classification_table_name ON bot_data_classification(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_classification_column_name ON bot_data_classification(column_name)',

      // Bot data export requests indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_export_requests_bot_id ON bot_data_export_requests(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_export_requests_user_id ON bot_data_export_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_export_requests_status ON bot_data_export_requests(status)',

      // Bot data import requests indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_import_requests_bot_id ON bot_data_import_requests(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_import_requests_user_id ON bot_data_import_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_import_requests_status ON bot_data_import_requests(status)',

      // Bot data purging schedules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_purging_schedules_bot_id ON bot_data_purging_schedules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_purging_schedules_schedule_name ON bot_data_purging_schedules(schedule_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_purging_schedules_data_type ON bot_data_purging_schedules(data_type)',

      // Bot data archival configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_configs_bot_id ON bot_data_archival_configs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_configs_config_name ON bot_data_archival_configs(config_name)',

      // Bot data archival operations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_operations_bot_id ON bot_data_archival_operations(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_operations_config_id ON bot_data_archival_operations(config_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_operations_status ON bot_data_archival_operations(status)',

      // Bot data archival logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_logs_bot_id ON bot_data_archival_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_logs_operation_id ON bot_data_archival_logs(operation_id)',
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
