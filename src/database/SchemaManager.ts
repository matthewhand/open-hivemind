import type { Database } from 'sqlite';
import { injectable, singleton } from 'tsyringe';
import { Logger } from '@common/logger';
import type { ConnectionManager } from './ConnectionManager';
import { SchemaRegistry } from './schemas';

@singleton()
@injectable()
export class SchemaManager {
  private schemaRegistry = new SchemaRegistry();
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async initializeSchema(): Promise<void> {
    const db = this.connectionManager.getDatabase();
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Create all core tables first to respect foreign keys
    await this.createTables(db);

    // Ensure tables from modular schemas
    const schemas = this.schemaRegistry.getSchemas();
    for (const schema of schemas) {
      if (schema.ensureTable) {
        await schema.ensureTable(db);
      }
      if (schema.createTables) {
        await schema.createTables(db);
      }
    }

    // Create all indexes
    await this.createIndexes(db);

    for (const schema of schemas) {
      if (schema.createIndexes) {
        await schema.createIndexes(db);
      }
    }

    Logger.info('Database schema initialized successfully');
  }

  private async createTables(db: Database): Promise<void> {
    // Bots table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        config TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // MCP servers table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        endpoint TEXT NOT NULL,
        auth_token TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Personas table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Bot configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // MCP templates table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS mcp_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Provider configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS provider_configs (
        id TEXT PRIMARY KEY,
        provider_name TEXT NOT NULL UNIQUE,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Sessions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Bot-to-user mappings table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_mappings (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES sessions (user_id) ON DELETE CASCADE,
        UNIQUE(bot_id, user_id)
      )
    `
    );

    // Bot templates table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Bot versions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_versions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        version_number TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot approvals table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_approvals (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        approver_id TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot scheduling table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_scheduling (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_config TEXT NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        next_run DATETIME,
        last_run DATETIME,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot feedback table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_feedback (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        feedback_text TEXT,
        rating INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot training data table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_training_data (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        input_text TEXT NOT NULL,
        output_text TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot knowledge base table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_knowledge_base (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user sessions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_sessions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_end DATETIME,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot conversation history table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_conversation_history (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

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

    // Bot sentiment analysis table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_sentiment_analysis (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        sentiment_score REAL,
        sentiment_label TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot entity extraction table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_entity_extraction (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        entity_type TEXT,
        entity_value TEXT,
        confidence_score REAL,
        extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot intent classification table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_intent_classification (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        intent_name TEXT,
        confidence_score REAL,
        classified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `
    );

    // Bot conversation flows table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_conversation_flows (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        flow_name TEXT NOT NULL,
        definition TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot conversation flow executions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_conversation_flow_executions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        flow_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        current_step TEXT,
        context_data TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (flow_id) REFERENCES bot_conversation_flows (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user profiles table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_profiles (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        profile_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user preferences table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_preferences (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        preference_key TEXT NOT NULL,
        preference_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot user tags table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_tags (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

    // Bot data portability requests table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_portability_requests (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        request_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot automated testing table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_automated_testing (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        test_name TEXT NOT NULL,
        test_definition TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        last_run DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot test results table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_test_results (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        test_id TEXT NOT NULL,
        result_data TEXT NOT NULL,
        status TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (test_id) REFERENCES bot_automated_testing (id) ON DELETE CASCADE
      )
    `
    );

    // Bot experiment tracking table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_experiment_tracking (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        experiment_name TEXT NOT NULL,
        variant_name TEXT NOT NULL,
        result_data TEXT,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

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

    Logger.info('All database tables created successfully');
  }

  private async createTable(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (err: any) {
      Logger.error(`Error creating table: ${err.message}`);
      throw err;
    }
  }

  private async createIndexes(db: Database): Promise<void> {
    // Define all indexes
    const indexes = [
      // Bots indexes
      'CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status)',
      'CREATE INDEX IF NOT EXISTS idx_bots_provider ON bots(provider)',
      'CREATE INDEX IF NOT EXISTS idx_bots_created_at ON bots(created_at)',

      // MCP servers indexes
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_created_at ON mcp_servers(created_at)',

      // Personas indexes
      'CREATE INDEX IF NOT EXISTS idx_personas_name ON personas(name)',

      // Bot configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_configs_bot_id ON bot_configs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_configs_config_key ON bot_configs(config_key)',

      // MCP templates indexes
      'CREATE INDEX IF NOT EXISTS idx_mcp_templates_name ON mcp_templates(name)',

      // Provider configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_provider_configs_provider_name ON provider_configs(provider_name)',

      // Sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)',

      // Bot-to-user mappings indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_mappings_bot_id ON bot_user_mappings(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_mappings_user_id ON bot_user_mappings(user_id)',

      // Bot templates indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_templates_name ON bot_templates(name)',

      // Bot versions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_versions_bot_id ON bot_versions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_versions_version_number ON bot_versions(version_number)',

      // Bot approvals indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_bot_id ON bot_approvals(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_approver_id ON bot_approvals(approver_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_status ON bot_approvals(status)',

      // Bot scheduling indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_bot_id ON bot_scheduling(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_status ON bot_scheduling(status)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_next_run ON bot_scheduling(next_run)',
      'CREATE INDEX IF NOT EXISTS idx_bot_scheduling_last_run ON bot_scheduling(last_run)',

      // Bot feedback indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_bot_id ON bot_feedback(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_user_id ON bot_feedback(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_rating ON bot_feedback(rating)',
      'CREATE INDEX IF NOT EXISTS idx_bot_feedback_created_at ON bot_feedback(created_at)',

      // Bot training data indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_training_data_bot_id ON bot_training_data(bot_id)',

      // Bot knowledge base indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_knowledge_base_bot_id ON bot_knowledge_base(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_knowledge_base_title ON bot_knowledge_base(title)',

      // Bot user sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_bot_id ON bot_user_sessions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_user_id ON bot_user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_status ON bot_user_sessions(status)',

      // Bot conversation history indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_bot_id ON bot_conversation_history(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_user_id ON bot_conversation_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_timestamp ON bot_conversation_history(timestamp)',

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

      // Bot sentiment analysis indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_sentiment_analysis_bot_id ON bot_sentiment_analysis(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_sentiment_analysis_message_id ON bot_sentiment_analysis(message_id)',

      // Bot entity extraction indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_entity_extraction_bot_id ON bot_entity_extraction(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_entity_extraction_message_id ON bot_entity_extraction(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_entity_extraction_entity_type ON bot_entity_extraction(entity_type)',

      // Bot intent classification indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_intent_classification_bot_id ON bot_intent_classification(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_intent_classification_message_id ON bot_intent_classification(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_intent_classification_intent_name ON bot_intent_classification(intent_name)',

      // Bot conversation flows indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flows_bot_id ON bot_conversation_flows(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flows_flow_name ON bot_conversation_flows(flow_name)',

      // Bot conversation flow executions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flow_executions_bot_id ON bot_conversation_flow_executions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flow_executions_flow_id ON bot_conversation_flow_executions(flow_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_flow_executions_status ON bot_conversation_flow_executions(status)',

      // Bot user profiles indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_profiles_bot_id ON bot_user_profiles(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_profiles_user_id ON bot_user_profiles(user_id)',

      // Bot user preferences indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_preferences_bot_id ON bot_user_preferences(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_preferences_user_id ON bot_user_preferences(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_preferences_preference_key ON bot_user_preferences(preference_key)',

      // Bot user tags indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_tags_bot_id ON bot_user_tags(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_tags_user_id ON bot_user_tags(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_tags_tag_name ON bot_user_tags(tag_name)',

      // Bot data retention policies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_bot_id ON bot_data_retention_policies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_data_type ON bot_data_retention_policies(data_type)',

      // Bot data portability requests indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_portability_requests_bot_id ON bot_data_portability_requests(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_portability_requests_user_id ON bot_data_portability_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_portability_requests_status ON bot_data_portability_requests(status)',

      // Bot automated testing indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_automated_testing_bot_id ON bot_automated_testing(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_automated_testing_test_name ON bot_automated_testing(test_name)',

      // Bot test results indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_test_results_bot_id ON bot_test_results(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_test_results_test_id ON bot_test_results(test_id)',

      // Bot experiment tracking indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_bot_id ON bot_experiment_tracking(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_experiment_name ON bot_experiment_tracking(experiment_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_variant_name ON bot_experiment_tracking(variant_name)',

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

      // Bot data archival logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_logs_bot_id ON bot_data_archival_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_archival_logs_operation_id ON bot_data_archival_logs(operation_id)',
    ];

    // Create all indexes
    for (const indexSql of indexes) {
      await this.createIndex(db, indexSql);
    }

    Logger.info('All database indexes created successfully');
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
