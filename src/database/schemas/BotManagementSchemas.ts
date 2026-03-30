import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

export class BotManagementSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
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

    // Bot workflow definitions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_workflow_definitions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot workflow executions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_workflow_executions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        status TEXT DEFAULT 'running',
        input_data TEXT,
        output_data TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (workflow_id) REFERENCES bot_workflow_definitions (id) ON DELETE CASCADE
      )
    `
    );

    // Bot approval workflows table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_approval_workflows (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        workflow_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
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

    Logger.info('Bot management schemas created successfully');
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Bot dependencies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_dependencies_bot_id ON bot_dependencies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_dependencies_dependency_name ON bot_dependencies(dependency_name)',

      // Bot workflow definitions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_workflow_definitions_bot_id ON bot_workflow_definitions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_workflow_definitions_workflow_name ON bot_workflow_definitions(workflow_name)',

      // Bot workflow executions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_workflow_executions_bot_id ON bot_workflow_executions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_workflow_executions_workflow_id ON bot_workflow_executions(workflow_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_workflow_executions_status ON bot_workflow_executions(status)',

      // Bot approval workflows indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_approval_workflows_bot_id ON bot_approval_workflows(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approval_workflows_workflow_name ON bot_approval_workflows(workflow_name)',

      // Bot automation rules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_rules_bot_id ON bot_automation_rules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_rules_rule_name ON bot_automation_rules(rule_name)',

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

      // Bot incident management indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_incident_management_bot_id ON bot_incident_management(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_incident_management_severity ON bot_incident_management(severity)',
      'CREATE INDEX IF NOT EXISTS idx_bot_incident_management_status ON bot_incident_management(status)',
    ];

    for (const sql of indexes) {
      await this.createIndex(db, sql);
    }

    Logger.info('Bot management schema indexes created successfully');
  }

  getTableNames(): string[] {
    return [
      'bot_dependencies',
      'bot_workflow_definitions',
      'bot_workflow_executions',
      'bot_approval_workflows',
      'bot_automation_rules',
      'bot_escalation_policies',
      'bot_on_call_schedules',
      'bot_maintenance_windows',
      'bot_change_management',
      'bot_approval_tracking',
      'bot_incident_management',
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
