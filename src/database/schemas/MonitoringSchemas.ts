import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import type { ISchemaModule } from './ISchemaModule';

export class MonitoringSchemas implements ISchemaModule {
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
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Health checks indexes
      'CREATE INDEX IF NOT EXISTS idx_health_checks_server_id ON health_checks(server_id)',
      'CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status)',
      'CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp)',

      // Bot health checks indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_bot_id ON bot_health_checks(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_check_type ON bot_health_checks(check_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_status ON bot_health_checks(status)',

      // Bot monitoring indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_bot_id ON bot_monitoring(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_metric_name ON bot_monitoring(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_alert_status ON bot_monitoring(alert_status)',

      // Bot performance metrics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_bot_id ON bot_performance_metrics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_metric_name ON bot_performance_metrics(metric_name)',

      // Bot statistics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_bot_id ON bot_statistics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_metric_name ON bot_statistics(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_recorded_at ON bot_statistics(recorded_at)',

      // Bot anomaly detection indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_bot_id ON bot_anomaly_detection(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_anomaly_type ON bot_anomaly_detection(anomaly_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_severity ON bot_anomaly_detection(severity)',

      // Bot resource usage indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_resource_usage_bot_id ON bot_resource_usage(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_resource_usage_resource_type ON bot_resource_usage(resource_type)',
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
