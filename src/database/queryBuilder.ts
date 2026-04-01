import Debug from 'debug';
import type { Database } from 'sqlite';
import { DatabaseError } from '@src/types/errorClasses';

const debug = Debug('app:QueryBuilder');

export class QueryBuilder {
  static async initializeSchema(db: Database | null): Promise<void> {
    if (!db) throw new DatabaseError('Database not initialized', 'DATABASE_NOT_INITIALIZED');
    await QueryBuilder.createTables(db);
    await QueryBuilder.createIndexes(db);
    await QueryBuilder.migrate(db);
  }

  static async createTables(db: Database): Promise<void> {
    // Messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        messageId TEXT NOT NULL,
        channelId TEXT NOT NULL,
        content TEXT NOT NULL,
        authorId TEXT NOT NULL,
        authorName TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        provider TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Conversation summaries table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channelId TEXT NOT NULL,
        summary TEXT NOT NULL,
        messageCount INTEGER NOT NULL,
        startTimestamp DATETIME NOT NULL,
        endTimestamp DATETIME NOT NULL,
        provider TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bot metrics table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        botName TEXT NOT NULL,
        messagesSent INTEGER DEFAULT 0,
        messagesReceived INTEGER DEFAULT 0,
        conversationsHandled INTEGER DEFAULT 0,
        averageResponseTime REAL DEFAULT 0,
        lastActivity DATETIME,
        provider TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bot sessions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sessionId TEXT UNIQUE NOT NULL,
        botName TEXT NOT NULL,
        channelId TEXT NOT NULL,
        provider TEXT NOT NULL,
        startTime DATETIME NOT NULL,
        endTime DATETIME,
        messageCount INTEGER DEFAULT 0,
        isActive BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Bot configurations table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        messageProvider TEXT NOT NULL,
        llmProvider TEXT NOT NULL,
        persona TEXT,
        systemInstruction TEXT,
        mcpServers TEXT,
        mcpGuard TEXT,
        discord TEXT,
        slack TEXT,
        mattermost TEXT,
        openai TEXT,
        flowise TEXT,
        openwebui TEXT,
        openswarm TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdBy TEXT,
        updatedBy TEXT
      )
    `);

    // Bot configuration versions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_configuration_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        botConfigurationId INTEGER NOT NULL,
        version INTEGER NOT NULL,
        name TEXT NOT NULL,
        messageProvider TEXT NOT NULL,
        llmProvider TEXT NOT NULL,
        persona TEXT,
        systemInstruction TEXT,
        mcpServers TEXT,
        mcpGuard TEXT,
        discord TEXT,
        slack TEXT,
        mattermost TEXT,
        openai TEXT,
        flowise TEXT,
        openwebui TEXT,
        openswarm TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        createdBy TEXT,
        changeLog TEXT,
        FOREIGN KEY (botConfigurationId) REFERENCES bot_configurations(id) ON DELETE CASCADE
      )
    `);

    // Bot configuration audit table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_configuration_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        botConfigurationId INTEGER NOT NULL,
        action TEXT NOT NULL,
        oldValues TEXT,
        newValues TEXT,
        performedBy TEXT,
        performedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        ipAddress TEXT,
        userAgent TEXT,
        FOREIGN KEY (botConfigurationId) REFERENCES bot_configurations(id) ON DELETE CASCADE
      )
    `);

    // Tenants table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT UNIQUE NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        maxBots INTEGER DEFAULT 5,
        maxUsers INTEGER DEFAULT 3,
        storageQuota INTEGER DEFAULT 1073741824,
        features TEXT, -- JSON array
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiresAt DATETIME
      )
    `);

    // Roles table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        level INTEGER DEFAULT 0,
        permissions TEXT, -- JSON array
        isActive BOOLEAN DEFAULT 1,
        tenantId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    // Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        roleId INTEGER,
        tenantId TEXT NOT NULL,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastLogin DATETIME,
        FOREIGN KEY (roleId) REFERENCES roles(id),
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    // Audits table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        userId INTEGER,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resourceId TEXT,
        tenantId TEXT NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        severity TEXT DEFAULT 'info',
        status TEXT DEFAULT 'success',
        details TEXT, -- JSON
        metadata TEXT, -- JSON
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (tenantId) REFERENCES tenants(id)
      )
    `);

    // Approval requests table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resourceType TEXT NOT NULL,
        resourceId INTEGER NOT NULL,
        changeType TEXT NOT NULL,
        requestedBy TEXT NOT NULL,
        diff TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewedBy TEXT,
        reviewedAt DATETIME,
        reviewComments TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        tenantId TEXT,
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    // Anomalies table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        expectedMean REAL NOT NULL,
        standardDeviation REAL NOT NULL,
        zScore REAL NOT NULL,
        threshold REAL NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        explanation TEXT NOT NULL,
        resolved BOOLEAN DEFAULT 0,
        tenantId TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
      )
    `);

    // AI Feedback table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recommendationId TEXT NOT NULL,
        feedback TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    debug('Database tables created');
  }

  static async createIndexes(db: Database): Promise<void> {
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_channel_timestamp ON messages(channelId, timestamp DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(authorId, timestamp DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_provider ON messages(provider, timestamp DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_metrics_bot ON bot_metrics(botName, provider)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_sessions_active ON bot_sessions(isActive, channelId)`
    );

    // Bot configuration indexes
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_name ON bot_configurations(name)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_active ON bot_configurations(isActive)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_provider ON bot_configurations(messageProvider, llmProvider)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_updated_at ON bot_configurations(updatedAt DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_config ON bot_configuration_versions(botConfigurationId, version DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_created_at ON bot_configuration_versions(createdAt DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_config ON bot_configuration_audit(botConfigurationId, performedAt DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_performed_at ON bot_configuration_audit(performedAt DESC)`
    );

    // Approval requests indexes
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_resource ON approval_requests(resourceType, resourceId)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requestedBy)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(createdAt DESC)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant ON approval_requests(tenantId)`
    );

    // Anomalies indexes
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp DESC)`
    );
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_metric ON anomalies(metric)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON anomalies(resolved)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_tenant ON anomalies(tenantId)`);

    // AI Feedback indexes
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_ai_feedback_recommendation ON ai_feedback(recommendationId)`
    );

    debug('Database indexes created');
  }

  static async migrate(db: Database): Promise<void> {
    try {
      // Add tenantId columns to existing tables
      await db.exec(`ALTER TABLE bot_configurations ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_configuration_versions ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_configuration_audit ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE messages ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_sessions ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_metrics ADD COLUMN tenantId TEXT`);

      // Add RBAC enhancements to roles table
      await db.exec(`ALTER TABLE roles ADD COLUMN description TEXT`);
      await db.exec(`ALTER TABLE roles ADD COLUMN level INTEGER DEFAULT 0`);
      await db.exec(`ALTER TABLE roles ADD COLUMN isActive BOOLEAN DEFAULT 1`);
      await db.exec(`ALTER TABLE roles ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP`);
      await db.exec(`ALTER TABLE roles ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP`);

      // Add indexes for tenantId
      await db.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_configurations_tenant ON bot_configurations(tenantId)`
      );
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenantId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_sessions_tenant ON bot_sessions(tenantId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_metrics_tenant ON bot_metrics(tenantId)`);
      await db.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_tenant ON bot_configuration_versions(tenantId)`
      );
      await db.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_tenant ON bot_configuration_audit(tenantId)`
      );
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenantId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenantId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_tenant ON audits(tenantId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_user ON audits(userId)`);

      debug('Database migration completed');
    } catch (error) {
      // Ignore errors if columns already exist (SQLite ALTER throws if exists)
      if ((error as Error).message.includes('duplicate column name')) {
        debug('Some columns already exist, skipping');
      } else {
        debug('Migration error:', error);
        throw error;
      }
    }
  }
}
