import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Incident & reporting tables: bot_alert_configurations, bot_incident_management,
 * bot_escalation_policies, bot_on_call_schedules, bot_maintenance_windows,
 * bot_change_management, bot_approval_tracking, bot_automation_rules,
 * bot_dashboard_configs, bot_report_definitions, bot_report_results,
 * bot_visualization_configs
 */
export class IncidentSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Bot alert configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_alert_configurations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        alert_name TEXT NOT NULL,
        condition TEXT NOT NULL,
        notification_channels TEXT,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot incident management table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_incident_management (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        incident_title TEXT NOT NULL,
        description TEXT,
        severity TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'open',
        assigned_to TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot escalation policies table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_escalation_policies (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        policy_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot on-call schedules table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_on_call_schedules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot maintenance windows table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_maintenance_windows (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        window_name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        recurrence_pattern TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot change management table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_change_management (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        change_title TEXT NOT NULL,
        description TEXT,
        change_type TEXT DEFAULT 'enhancement',
        status TEXT DEFAULT 'pending',
        requested_by TEXT,
        approved_by TEXT,
        scheduled_for DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot approval tracking table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_approval_tracking (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        approval_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        requested_by TEXT,
        approved_by TEXT,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot automation rules table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_automation_rules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        trigger_condition TEXT NOT NULL,
        action_definition TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot dashboard configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_dashboard_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        dashboard_name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot report definitions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_report_definitions (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        report_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        schedule_config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot report results table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_report_results (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        report_id TEXT NOT NULL,
        result_data TEXT NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL,
        FOREIGN KEY (report_id) REFERENCES bot_report_definitions (id) ON DELETE CASCADE
      )
    `
    );

    // Bot visualization configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_visualization_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        visualization_name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Bot alert configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_configurations_bot_id ON bot_alert_configurations(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_configurations_alert_name ON bot_alert_configurations(alert_name)',

      // Bot incident management indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_incident_management_bot_id ON bot_incident_management(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_incident_management_severity ON bot_incident_management(severity)',
      'CREATE INDEX IF NOT EXISTS idx_bot_incident_management_status ON bot_incident_management(status)',

      // Bot escalation policies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_escalation_policies_bot_id ON bot_escalation_policies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_escalation_policies_policy_name ON bot_escalation_policies(policy_name)',

      // Bot on-call schedules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_on_call_schedules_bot_id ON bot_on_call_schedules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_on_call_schedules_schedule_name ON bot_on_call_schedules(schedule_name)',

      // Bot maintenance windows indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_maintenance_windows_bot_id ON bot_maintenance_windows(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_maintenance_windows_start_time ON bot_maintenance_windows(start_time)',

      // Bot change management indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_change_management_bot_id ON bot_change_management(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_change_management_status ON bot_change_management(status)',

      // Bot approval tracking indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_approval_tracking_bot_id ON bot_approval_tracking(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approval_tracking_approval_type ON bot_approval_tracking(approval_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approval_tracking_status ON bot_approval_tracking(status)',

      // Bot automation rules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_rules_bot_id ON bot_automation_rules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_rules_rule_name ON bot_automation_rules(rule_name)',

      // Bot dashboard configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_dashboard_configs_bot_id ON bot_dashboard_configs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_dashboard_configs_dashboard_name ON bot_dashboard_configs(dashboard_name)',

      // Bot report definitions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_report_definitions_bot_id ON bot_report_definitions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_report_definitions_report_name ON bot_report_definitions(report_name)',

      // Bot report results indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_report_results_bot_id ON bot_report_results(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_report_results_report_id ON bot_report_results(report_id)',

      // Bot visualization configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_visualization_configs_bot_id ON bot_visualization_configs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_visualization_configs_visualization_name ON bot_visualization_configs(visualization_name)',
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
