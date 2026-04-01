import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Workflow tables: bot_workflow_definitions, bot_workflow_executions,
 * bot_approval_workflows, bot_custom_commands, bot_scheduled_messages,
 * bot_message_templates
 */
export class WorkflowSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
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

    // Bot custom commands table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_custom_commands (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        command_name TEXT NOT NULL,
        command_definition TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot scheduled messages table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_scheduled_messages (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot message templates table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_message_templates (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        template_name TEXT NOT NULL,
        template_content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
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

      // Bot custom commands indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_custom_commands_bot_id ON bot_custom_commands(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_custom_commands_command_name ON bot_custom_commands(command_name)',

      // Bot scheduled messages indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduled_messages_bot_id ON bot_scheduled_messages(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduled_messages_channel_id ON bot_scheduled_messages(channel_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduled_messages_status ON bot_scheduled_messages(status)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduled_messages_scheduled_time ON bot_scheduled_messages(scheduled_time)',

      // Bot message templates indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_message_templates_bot_id ON bot_message_templates(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_message_templates_template_name ON bot_message_templates(template_name)',
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
