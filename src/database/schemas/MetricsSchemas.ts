import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import type { ISchemaModule } from './ISchemaModule';

export class MetricsSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
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
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
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

      // Bot API usage indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_bot_id ON bot_api_usage(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_api_key_id ON bot_api_usage(api_key_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_endpoint ON bot_api_usage(endpoint)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_timestamp ON bot_api_usage(timestamp)',

      // Bot data validation results indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_bot_id ON bot_data_validation_results(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_validation_rule_id ON bot_data_validation_results(validation_rule_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_validation_date ON bot_data_validation_results(validation_date)',

      // Bot data quality alerts indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_bot_id ON bot_data_quality_alerts(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_alert_type ON bot_data_quality_alerts(alert_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_severity ON bot_data_quality_alerts(alert_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_resolved ON bot_data_quality_alerts(resolved)',

      // Bot activity indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_bot_id ON bot_activity(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_activity_type ON bot_activity(activity_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_timestamp ON bot_activity(timestamp)',
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
