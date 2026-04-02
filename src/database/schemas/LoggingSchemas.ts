import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import type { ISchemaModule } from './ISchemaModule';

export class LoggingSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Activity logs table
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

    // Message logs table
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

    // Bot audit logs table
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

    // Bot error logs table
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

    // Bot compliance logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_compliance_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot alert logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_alert_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        alert_id TEXT,
        alert_message TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        resolved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL,
        FOREIGN KEY (alert_id) REFERENCES bot_alert_configurations (id) ON DELETE SET NULL
      )
    `
    );

    // Bot data access logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_access_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        user_id TEXT,
        table_name TEXT,
        operation_type TEXT NOT NULL,
        record_count INTEGER DEFAULT 1,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot data retention logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_retention_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        records_deleted INTEGER DEFAULT 0,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data archival logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_archival_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        log_message TEXT NOT NULL,
        log_level TEXT DEFAULT 'info',
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (operation_id) REFERENCES bot_data_archival_operations (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data anonymization logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_anonymization_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        records_processed INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot backup logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_backup_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        backup_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot automation execution logs table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_automation_execution_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        execution_result TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (rule_id) REFERENCES bot_automation_rules (id) ON DELETE CASCADE
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Activity logs indexes
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_bot_id ON activity_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',

      // Message logs indexes
      'CREATE INDEX IF NOT EXISTS idx_message_logs_bot_id ON message_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_logs_user_id ON message_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp ON message_logs(timestamp)',

      // Bot audit logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_bot_id ON bot_audit_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_user_id ON bot_audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_timestamp ON bot_audit_logs(timestamp)',

      // Bot error logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_bot_id ON bot_error_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_severity ON bot_error_logs(severity)',
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_timestamp ON bot_error_logs(timestamp)',

      // Bot compliance logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_compliance_logs_bot_id ON bot_compliance_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_compliance_logs_user_id ON bot_compliance_logs(user_id)',

      // Bot alert logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_bot_id ON bot_alert_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_alert_id ON bot_alert_logs(alert_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_severity ON bot_alert_logs(severity)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_resolved ON bot_alert_logs(resolved)',

      // Bot data access logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_bot_id ON bot_data_access_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_user_id ON bot_data_access_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_table_name ON bot_data_access_logs(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_operation_type ON bot_data_access_logs(operation_type)',

      // Bot data retention logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_logs_bot_id ON bot_data_retention_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_logs_data_type ON bot_data_retention_logs(data_type)',

      // Bot data anonymization logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_anonymization_logs_bot_id ON bot_data_anonymization_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_anonymization_logs_data_type ON bot_data_anonymization_logs(data_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_anonymization_logs_status ON bot_data_anonymization_logs(status)',

      // Bot backup logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_logs_bot_id ON bot_backup_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_logs_status ON bot_backup_logs(status)',

      // Bot automation execution logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_execution_logs_bot_id ON bot_automation_execution_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_execution_logs_rule_id ON bot_automation_execution_logs(rule_id)',
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
