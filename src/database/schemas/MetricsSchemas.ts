import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import type { ISchemaModule } from './ISchemaModule';

export class MetricsSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Health checks table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS health_checks (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        status TEXT NOT NULL,
        response_time INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES mcp_servers (id) ON DELETE CASCADE
      )
    `
    );

    // Bot statistics table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_statistics (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot monitoring table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_monitoring (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        threshold_value REAL,
        alert_status TEXT DEFAULT 'ok',
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot performance metrics table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_performance_metrics (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        unit TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot health checks table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_health_checks (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        check_type TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot analytics snapshots table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_analytics_snapshots (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        snapshot_data TEXT NOT NULL,
        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot model performance table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_model_performance (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data quality metrics table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_quality_metrics (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );
    // Bot resource usage table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_resource_usage (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_value REAL NOT NULL,
        unit TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot API usage table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_api_usage (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        api_key_id TEXT,
        endpoint TEXT NOT NULL,
        response_time INTEGER,
        status_code INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL,
        FOREIGN KEY (api_key_id) REFERENCES bot_api_keys (id) ON DELETE SET NULL
      )
    `
    );

    // Bot anomaly detection table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_anomaly_detection (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        anomaly_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        details TEXT,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot data validation results table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_validation_results (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        validation_rule_id TEXT NOT NULL,
        record_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        validation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (validation_rule_id) REFERENCES bot_data_validation_rules (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data quality alerts table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_quality_alerts (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        message TEXT NOT NULL,
        resolved BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

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

    // Bot activity table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_activity (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        activity_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
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
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Health checks indexes
      'CREATE INDEX IF NOT EXISTS idx_health_checks_server_id ON health_checks(server_id)',
      'CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status)',
      'CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp)',

      // Bot statistics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_bot_id ON bot_statistics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_metric_name ON bot_statistics(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_recorded_at ON bot_statistics(recorded_at)',

      // Bot monitoring indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_bot_id ON bot_monitoring(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_metric_name ON bot_monitoring(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_alert_status ON bot_monitoring(alert_status)',

      // Bot performance metrics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_bot_id ON bot_performance_metrics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_metric_name ON bot_performance_metrics(metric_name)',

      // Bot health checks indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_bot_id ON bot_health_checks(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_check_type ON bot_health_checks(check_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_status ON bot_health_checks(status)',

      // Bot analytics snapshots indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_analytics_snapshots_bot_id ON bot_analytics_snapshots(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_analytics_snapshots_period_start ON bot_analytics_snapshots(period_start)',

      // Bot model performance indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_model_performance_bot_id ON bot_model_performance(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_model_performance_model_name ON bot_model_performance(model_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_model_performance_metric_name ON bot_model_performance(metric_name)',

      // Bot data quality metrics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_metrics_bot_id ON bot_data_quality_metrics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_metrics_metric_name ON bot_data_quality_metrics(metric_name)',
      // Bot resource usage indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_resource_usage_bot_id ON bot_resource_usage(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_resource_usage_resource_type ON bot_resource_usage(resource_type)',

      // Bot API usage indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_bot_id ON bot_api_usage(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_api_key_id ON bot_api_usage(api_key_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_endpoint ON bot_api_usage(endpoint)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_timestamp ON bot_api_usage(timestamp)',

      // Bot anomaly detection indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_bot_id ON bot_anomaly_detection(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_anomaly_type ON bot_anomaly_detection(anomaly_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_severity ON bot_anomaly_detection(severity)',

      // Bot data validation results indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_bot_id ON bot_data_validation_results(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_validation_rule_id ON bot_data_validation_results(validation_rule_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_validation_date ON bot_data_validation_results(validation_date)',

      // Bot data quality alerts indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_bot_id ON bot_data_quality_alerts(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_alert_type ON bot_data_quality_alerts(alert_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_severity ON bot_data_quality_alerts(alert_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_resolved ON bot_data_quality_alerts(resolved)',

      // Activity logs indexes
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_bot_id ON activity_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',

      // Message logs indexes
      'CREATE INDEX IF NOT EXISTS idx_message_logs_bot_id ON message_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_logs_user_id ON message_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp ON message_logs(timestamp)',

      // Bot activity indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_bot_id ON bot_activity(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_activity_type ON bot_activity(activity_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_timestamp ON bot_activity(timestamp)',

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

      // Bot automation execution logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_execution_logs_bot_id ON bot_automation_execution_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_execution_logs_rule_id ON bot_automation_execution_logs(rule_id)',

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
