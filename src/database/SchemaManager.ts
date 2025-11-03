import { Database } from 'sqlite3';
import { ConnectionManager } from './ConnectionManager';
import { Logger } from '../common/logger';

export class SchemaManager {
  private connectionManager: ConnectionManager;

  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }

  async initializeSchema(): Promise<void> {
    const db = this.connectionManager.getDatabase();
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Create all tables
    await this.createTables(db);
    
    // Create all indexes
    await this.createIndexes(db);
    
    Logger.info('Database schema initialized successfully');
  }

  private async createTables(db: Database): Promise<void> {
    // Bots table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        config TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // MCP servers table
    await this.createTable(db, `
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
    `);

    // Personas table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bot configurations table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // MCP templates table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS mcp_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity logs table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Message logs table
    await this.createTable(db, `
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
    `);

    // Health checks table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS health_checks (
        id TEXT PRIMARY KEY,
        server_id TEXT NOT NULL,
        status TEXT NOT NULL,
        response_time INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (server_id) REFERENCES mcp_servers (id) ON DELETE CASCADE
      )
    `);

    // Provider configurations table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS provider_configs (
        id TEXT PRIMARY KEY,
        provider_name TEXT NOT NULL UNIQUE,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User permissions table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        permission TEXT NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES sessions (user_id) ON DELETE CASCADE
      )
    `);

    // Bot-to-user mappings table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_user_mappings (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES sessions (user_id) ON DELETE CASCADE,
        UNIQUE(bot_id, user_id)
      )
    `);

    // Bot templates table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bot versions table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_versions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        version_number TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot approvals table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_approvals (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        approver_id TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Channel routing table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS channel_routing (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        bot_id TEXT NOT NULL,
        priority INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot statistics table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_statistics (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot activity table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_activity (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        activity_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot scheduling table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_scheduling (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_config TEXT NOT NULL,
        next_run DATETIME,
        last_run DATETIME,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot feedback table
    await this.createTable(db, `
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
    `);

    // Bot training data table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_training_data (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        input_text TEXT NOT NULL,
        output_text TEXT NOT NULL,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot knowledge base table
    await this.createTable(db, `
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
    `);

    // Bot monitoring table
    await this.createTable(db, `
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
    `);

    // Bot audit logs table
    await this.createTable(db, `
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
    `);

    // Bot error logs table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_error_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        severity TEXT DEFAULT 'medium',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Bot performance metrics table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_performance_metrics (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        unit TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot user sessions table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_user_sessions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
        session_end DATETIME,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot conversation history table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_conversation_history (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot rate limiting table
    await this.createTable(db, `
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
    `);

    // Bot security events table
    await this.createTable(db, `
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
    `);

    // Bot webhook configurations table
    await this.createTable(db, `
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
    `);

    // Bot integrations table
    await this.createTable(db, `
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
    `);

    // Bot notifications table
    await this.createTable(db, `
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
    `);

    // Bot custom fields table
    await this.createTable(db, `
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
    `);

    // Bot feature flags table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_feature_flags (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        feature_name TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot compliance logs table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_compliance_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot data exports table
    await this.createTable(db, `
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
    `);

    // Bot data imports table
    await this.createTable(db, `
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
    `);

    // Bot backup configurations table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_backup_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot backup logs table
    await this.createTable(db, `
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
    `);

    // Bot health checks table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_health_checks (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        check_type TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot dependencies table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_dependencies (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        dependency_name TEXT NOT NULL,
        version TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot resource usage table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_resource_usage (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_value REAL NOT NULL,
        unit TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot configuration history table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_config_history (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config TEXT NOT NULL,
        changed_by TEXT,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot environment variables table
    await this.createTable(db, `
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
    `);

    // Bot API keys table
    await this.createTable(db, `
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
    `);

    // Bot API usage table
    await this.createTable(db, `
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
    `);

    // Bot workflow definitions table
    await this.createTable(db, `
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
    `);

    // Bot workflow executions table
    await this.createTable(db, `
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
    `);

    // Bot approval workflows table
    await this.createTable(db, `
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
    `);

    // Bot custom commands table
    await this.createTable(db, `
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
    `);

    // Bot scheduled messages table
    await this.createTable(db, `
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
    `);

    // Bot message templates table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_message_templates (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        template_name TEXT NOT NULL,
        template_content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Bot sentiment analysis table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_sentiment_analysis (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        sentiment_score REAL,
        sentiment_label TEXT,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Bot entity extraction table
    await this.createTable(db, `
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
    `);

    // Bot intent classification table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_intent_classification (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        message_id TEXT,
        intent_name TEXT,
        confidence_score REAL,
        classified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Bot conversation flows table
    await this.createTable(db, `
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
    `);

    // Bot conversation flow executions table
    await this.createTable(db, `
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
    `);

    // Bot user profiles table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_user_profiles (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        profile_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot user preferences table
    await this.createTable(db, `
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
    `);

    // Bot user tags table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_user_tags (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tag_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot analytics snapshots table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_analytics_snapshots (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        snapshot_data TEXT NOT NULL,
        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot data retention policies table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_data_retention_policies (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        retention_period_days INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot privacy compliance table
    await this.createTable(db, `
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
    `);

    // Bot data anonymization logs table
    await this.createTable(db, `
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
    `);

    // Bot consent management table
    await this.createTable(db, `
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
    `);

    // Bot data portability requests table
    await this.createTable(db, `
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
    `);

    // Bot automated testing table
    await this.createTable(db, `
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
    `);

    // Bot test results table
    await this.createTable(db, `
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
    `);

    // Bot model performance table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_model_performance (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot experiment tracking table
    await this.createTable(db, `
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
    `);

    // Bot anomaly detection table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_anomaly_detection (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        anomaly_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        details TEXT,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Bot alert configurations table
    await this.createTable(db, `
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
    `);

    // Bot alert logs table
    await this.createTable(db, `
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
    `);

    // Bot incident management table
    await this.createTable(db, `
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
    `);

    // Bot escalation policies table
    await this.createTable(db, `
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
    `);

    // Bot on-call schedules table
    await this.createTable(db, `
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
    `);

    // Bot maintenance windows table
    await this.createTable(db, `
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
    `);

    // Bot change management table
    await this.createTable(db, `
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
    `);

    // Bot approval tracking table
    await this.createTable(db, `
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
    `);

    // Bot automation rules table
    await this.createTable(db, `
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
    `);

    // Bot automation execution logs table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_automation_execution_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        execution_result TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (rule_id) REFERENCES bot_automation_rules (id) ON DELETE CASCADE
      )
    `);

    // Bot dashboard configurations table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_dashboard_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        dashboard_name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Bot report definitions table
    await this.createTable(db, `
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
    `);

    // Bot report results table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_report_results (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        report_id TEXT NOT NULL,
        result_data TEXT NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL,
        FOREIGN KEY (report_id) REFERENCES bot_report_definitions (id) ON DELETE CASCADE
      )
    `);

    // Bot visualization configurations table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_visualization_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT,
        visualization_name TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE SET NULL
      )
    `);

    // Bot data sources table
    await this.createTable(db, `
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
    `);

    // Bot data transformations table
    await this.createTable(db, `
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
    `);

    // Bot data validation rules table
    await this.createTable(db, `
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
    `);

    // Bot data quality metrics table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_data_quality_metrics (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot data lineage table
    await this.createTable(db, `
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
    `);

    // Bot data catalog table
    await this.createTable(db, `
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
    `);

    // Bot backup schedules table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_backup_schedules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot restore operations table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_restore_operations (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        backup_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot data masking rules table
    await this.createTable(db, `
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
    `);

    // Bot data classification table
    await this.createTable(db, `
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
    `);

    // Bot data access logs table
    await this.createTable(db, `
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
    `);

    // Bot data export requests table
    await this.createTable(db, `
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
    `);

    // Bot data import requests table
    await this.createTable(db, `
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
    `);

    // Bot data validation results table
    await this.createTable(db, `
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
    `);

    // Bot data quality alerts table
    await this.createTable(db, `
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
    `);

    // Bot data retention logs table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_data_retention_logs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        records_deleted INTEGER DEFAULT 0,
        deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot data purging schedules table
    await this.createTable(db, `
      CREATE TABLE IF NOT EXISTS bot_data_purging_schedules (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        schedule_name TEXT NOT NULL,
        cron_expression TEXT NOT NULL,
        data_type TEXT NOT NULL,
        retention_period_days INTEGER NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `);

    // Bot data archival configurations table
    await this.createTable(db, `
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
    `);

    // Bot data archival operations table
    await this.createTable(db, `
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
    `);

    // Bot data archival logs table
    await this.createTable(db, `
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
    `);

    Logger.info('All database tables created successfully');
  }

  private async createTable(db: Database, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          Logger.error(`Error creating table: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });
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
      
      // Activity logs indexes
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_bot_id ON activity_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)',
      
      // Message logs indexes
      'CREATE INDEX IF NOT EXISTS idx_message_logs_bot_id ON message_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_logs_user_id ON message_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_message_logs_timestamp ON message_logs(timestamp)',
      
      // Health checks indexes
      'CREATE INDEX IF NOT EXISTS idx_health_checks_server_id ON health_checks(server_id)',
      'CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status)',
      'CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp)',
      
      // Provider configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_provider_configs_provider_name ON provider_configs(provider_name)',
      
      // Sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)',
      
      // User permissions indexes
      'CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission)',
      
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
      
      // Channel routing indexes
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_channel_id ON channel_routing(channel_id)',
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_bot_id ON channel_routing(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_priority ON channel_routing(priority)',
      'CREATE INDEX IF NOT EXISTS idx_channel_routing_enabled ON channel_routing(enabled)',
      
      // Bot statistics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_bot_id ON bot_statistics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_metric_name ON bot_statistics(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_statistics_recorded_at ON bot_statistics(recorded_at)',
      
      // Bot activity indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_bot_id ON bot_activity(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_activity_type ON bot_activity(activity_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_activity_timestamp ON bot_activity(timestamp)',
      
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
      
      // Bot monitoring indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_bot_id ON bot_monitoring(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_metric_name ON bot_monitoring(metric_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_monitoring_alert_status ON bot_monitoring(alert_status)',
      
      // Bot audit logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_bot_id ON bot_audit_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_user_id ON bot_audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_audit_logs_timestamp ON bot_audit_logs(timestamp)',
      
      // Bot error logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_bot_id ON bot_error_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_severity ON bot_error_logs(severity)',
      'CREATE INDEX IF NOT EXISTS idx_bot_error_logs_timestamp ON bot_error_logs(timestamp)',
      
      // Bot performance metrics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_bot_id ON bot_performance_metrics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_performance_metrics_metric_name ON bot_performance_metrics(metric_name)',
      
      // Bot user sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_bot_id ON bot_user_sessions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_user_id ON bot_user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_sessions_status ON bot_user_sessions(status)',
      
      // Bot conversation history indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_bot_id ON bot_conversation_history(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_user_id ON bot_conversation_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_conversation_history_timestamp ON bot_conversation_history(timestamp)',
      
      // Bot rate limits indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_bot_id ON bot_rate_limits(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_rate_limits_user_id ON bot_rate_limits(user_id)',
      
      // Bot security events indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_bot_id ON bot_security_events(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_event_type ON bot_security_events(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_security_events_severity ON bot_security_events(severity)',
      
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
      
      // Bot compliance logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_compliance_logs_bot_id ON bot_compliance_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_compliance_logs_user_id ON bot_compliance_logs(user_id)',
      
      // Bot data exports indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_exports_bot_id ON bot_data_exports(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_exports_status ON bot_data_exports(status)',
      
      // Bot data imports indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_imports_bot_id ON bot_data_imports(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_imports_status ON bot_data_imports(status)',
      
      // Bot backup configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_configs_bot_id ON bot_backup_configs(bot_id)',
      
      // Bot backup logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_logs_bot_id ON bot_backup_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_backup_logs_status ON bot_backup_logs(status)',
      
      // Bot health checks indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_bot_id ON bot_health_checks(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_check_type ON bot_health_checks(check_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_health_checks_status ON bot_health_checks(status)',
      
      // Bot dependencies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_dependencies_bot_id ON bot_dependencies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_dependencies_dependency_name ON bot_dependencies(dependency_name)',
      
      // Bot resource usage indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_resource_usage_bot_id ON bot_resource_usage(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_resource_usage_resource_type ON bot_resource_usage(resource_type)',
      
      // Bot configuration history indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_config_history_bot_id ON bot_config_history(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_config_history_created_at ON bot_config_history(created_at)',
      
      // Bot environment variables indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_environment_vars_bot_id ON bot_environment_vars(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_environment_vars_var_name ON bot_environment_vars(var_name)',
      
      // Bot API keys indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_api_keys_bot_id ON bot_api_keys(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_keys_api_key ON bot_api_keys(api_key)',
      
      // Bot API usage indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_bot_id ON bot_api_usage(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_api_key_id ON bot_api_usage(api_key_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_endpoint ON bot_api_usage(endpoint)',
      'CREATE INDEX IF NOT EXISTS idx_bot_api_usage_timestamp ON bot_api_usage(timestamp)',
      
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
      
      // Bot analytics snapshots indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_analytics_snapshots_bot_id ON bot_analytics_snapshots(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_analytics_snapshots_period_start ON bot_analytics_snapshots(period_start)',
      
      // Bot data retention policies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_bot_id ON bot_data_retention_policies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_data_type ON bot_data_retention_policies(data_type)',
      
      // Bot privacy compliance indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_privacy_compliance_bot_id ON bot_privacy_compliance(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_privacy_compliance_compliance_type ON bot_privacy_compliance(compliance_type)',
      
      // Bot data anonymization logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_anonymization_logs_bot_id ON bot_data_anonymization_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_anonymization_logs_data_type ON bot_data_anonymization_logs(data_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_anonymization_logs_status ON bot_data_anonymization_logs(status)',
      
      // Bot consent management indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_bot_id ON bot_consent_management(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_user_id ON bot_consent_management(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_consent_type ON bot_consent_management(consent_type)',
      
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
      
      // Bot model performance indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_model_performance_bot_id ON bot_model_performance(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_model_performance_model_name ON bot_model_performance(model_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_model_performance_metric_name ON bot_model_performance(metric_name)',
      
      // Bot experiment tracking indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_bot_id ON bot_experiment_tracking(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_experiment_name ON bot_experiment_tracking(experiment_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_variant_name ON bot_experiment_tracking(variant_name)',
      
      // Bot anomaly detection indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_bot_id ON bot_anomaly_detection(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_anomaly_type ON bot_anomaly_detection(anomaly_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_anomaly_detection_severity ON bot_anomaly_detection(severity)',
      
      // Bot alert configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_configurations_bot_id ON bot_alert_configurations(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_configurations_alert_name ON bot_alert_configurations(alert_name)',
      
      // Bot alert logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_bot_id ON bot_alert_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_alert_id ON bot_alert_logs(alert_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_severity ON bot_alert_logs(severity)',
      'CREATE INDEX IF NOT EXISTS idx_bot_alert_logs_resolved ON bot_alert_logs(resolved)',
      
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
      
      // Bot automation execution logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_execution_logs_bot_id ON bot_automation_execution_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_automation_execution_logs_rule_id ON bot_automation_execution_logs(rule_id)',
      
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
      
      // Bot data sources indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_sources_bot_id ON bot_data_sources(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_sources_source_name ON bot_data_sources(source_name)',
      
      // Bot data transformations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_transformations_bot_id ON bot_data_transformations(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_transformations_transformation_name ON bot_data_transformations(transformation_name)',
      
      // Bot data validation rules indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_rules_bot_id ON bot_data_validation_rules(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_rules_rule_name ON bot_data_validation_rules(rule_name)',
      
      // Bot data quality metrics indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_metrics_bot_id ON bot_data_quality_metrics(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_metrics_metric_name ON bot_data_quality_metrics(metric_name)',
      
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
      
      // Bot data access logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_bot_id ON bot_data_access_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_user_id ON bot_data_access_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_table_name ON bot_data_access_logs(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_access_logs_operation_type ON bot_data_access_logs(operation_type)',
      
      // Bot data export requests indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_export_requests_bot_id ON bot_data_export_requests(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_export_requests_user_id ON bot_data_export_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_export_requests_status ON bot_data_export_requests(status)',
      
      // Bot data import requests indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_import_requests_bot_id ON bot_data_import_requests(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_import_requests_user_id ON bot_data_import_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_import_requests_status ON bot_data_import_requests(status)',
      
      // Bot data validation results indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_bot_id ON bot_data_validation_results(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_validation_rule_id ON bot_data_validation_results(validation_rule_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_validation_results_validation_date ON bot_data_validation_results(validation_date)',
      
      // Bot data quality alerts indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_bot_id ON bot_data_quality_alerts(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_alert_type ON bot_data_quality_alerts(alert_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_severity ON bot_data_quality_alerts(alert_type)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_quality_alerts_resolved ON bot_data_quality_alerts(resolved)',
      
      // Bot data retention logs indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_logs_bot_id ON bot_data_retention_logs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_logs_data_type ON bot_data_retention_logs(data_type)',
      
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

    // Create all indexes
    for (const indexSql of indexes) {
      await this.createIndex(db, indexSql);
    }

    Logger.info('All database indexes created successfully');
  }

  private async createIndex(db: Database, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          Logger.error(`Error creating index: ${err.message}`);
          // Don't reject on index creation error as it might already exist
          resolve();
        } else {
          resolve();
        }
      });
    });
  }
}