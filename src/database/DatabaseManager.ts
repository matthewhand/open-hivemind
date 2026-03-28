import 'reflect-metadata';
import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { injectable, singleton } from 'tsyringe';
import { ConfigurationError, DatabaseError } from '@src/types/errorClasses';

// Re-export every type so existing `import { Foo } from '.../DatabaseManager'` keeps working.
export type {
  DatabaseConfig,
  MessageRecord,
  DiscordConfig,
  SlackConfig,
  MattermostConfig,
  OpenAIConfig,
  FlowiseConfig,
  OpenWebUIConfig,
  OpenSwarmConfig,
  PerplexityConfig,
  ReplicateConfig,
  N8nConfig,
  MCPCGuardConfig,
  ProviderConfig,
  ConversationSummary,
  BotMetrics,
  BotConfiguration,
  BotConfigurationVersion,
  BotConfigurationAudit,
  Tenant,
  Role,
  User,
  AuditEvent,
  Anomaly,
  ApprovalRequest,
  AIFeedback,
} from './types';

import type {
  DatabaseConfig,
  MessageRecord,
  ConversationSummary,
  BotMetrics,
  BotConfiguration,
  BotConfigurationVersion,
  BotConfigurationAudit,
  Anomaly,
  ApprovalRequest,
} from './types';

import { MessageRepository } from './MessageRepository';
import { BotConfigRepository } from './BotConfigRepository';
import { AnomalyRepository } from './AnomalyRepository';
import { ApprovalRepository } from './ApprovalRepository';
import { AIFeedbackRepository } from './AIFeedbackRepository';

const debug = Debug('app:DatabaseManager');

@singleton()
@injectable()
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private config?: DatabaseConfig;
  private configured = false;
  private connected = false;
  private db: Database | null = null;

  // Repositories
  private messageRepo!: MessageRepository;
  private botConfigRepo!: BotConfigRepository;
  private anomalyRepo!: AnomalyRepository;
  private approvalRepo!: ApprovalRepository;
  private aiFeedbackRepo!: AIFeedbackRepository;

  constructor(config?: DatabaseConfig) {
    if (config) {
      this.configure(config);
    }
    this.initRepositories();
  }

  // ---------------------------------------------------------------------------
  // Singleton / lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Gets the singleton instance of DatabaseManager.
   *
   * @param {DatabaseConfig} [config] - Optional database configuration to apply
   * @returns {DatabaseManager} The singleton instance
   * @example
   * ```typescript
   * const db = DatabaseManager.getInstance({
   *   type: 'sqlite',
   *   path: './data/hivemind.db'
   * });
   * await db.connect();
   * ```
   */

  static getInstance(config?: DatabaseConfig): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(config);
    } else if (config) {
      DatabaseManager.instance.configure(config);
    }
    return DatabaseManager.instance;
  }

  configure(config: DatabaseConfig): void {
    this.config = config;
    this.configured = true;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  private ensureConnected(): void {
    if (!this.configured) {
      throw new DatabaseError(
        'Database is not configured. Persistence features are currently disabled.',
        'DATABASE_NOT_CONFIGURED'
      );
    }

    if (!this.db || !this.connected) {
      throw new DatabaseError('Database not connected', 'DATABASE_NOT_CONNECTED');
    }
  }

  async connect(): Promise<void> {
    try {
      debug('Connecting to database...');

      if (!this.config) {
        debug('Database configuration not provided; database features are disabled.');
        return;
      }

      if (this.config.type === 'sqlite') {
        const dbPath = this.config.path || 'data/hivemind.db';

        // Ensure directory exists
        if (dbPath !== ':memory:') {
          const dbDir = join(dbPath, '..');
          await fs.mkdir(dbDir, { recursive: true });
        }

        this.db = await open({
          filename: dbPath,
          driver: sqlite3.Database,
        });

        await this.createTables();
        await this.createIndexes();
        await this.migrate();
      } else {
        throw new ConfigurationError(
          `Database type ${this.config.type} not yet implemented`,
          'DATABASE_TYPE_NOT_SUPPORTED'
        );
      }

      this.connected = true;
      debug('Database connected successfully');
    } catch (error) {
      debug('Database connection failed:', error);
      if (error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(
        `Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATABASE_CONNECTION_FAILED'
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      this.connected = false;
      debug('Database disconnected');
    } catch (error) {
      debug('Error disconnecting database:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ---------------------------------------------------------------------------
  // Repository initialisation
  // ---------------------------------------------------------------------------

  private initRepositories(): void {
    const getDb = () => this.db;
    const isConn = () => this.connected;
    const ensure = () => this.ensureConnected();

    this.messageRepo = new MessageRepository(getDb, isConn, ensure);
    this.botConfigRepo = new BotConfigRepository(getDb, ensure);
    this.anomalyRepo = new AnomalyRepository(getDb, isConn);
    this.approvalRepo = new ApprovalRepository(getDb, ensure);
    this.aiFeedbackRepo = new AIFeedbackRepository(getDb, ensure);
  }

  // ---------------------------------------------------------------------------
  // Schema creation (private, unchanged)
  // ---------------------------------------------------------------------------

  private async createTables(): Promise<void> {
    if (!this.db) throw new DatabaseError('Database not initialized', 'DATABASE_NOT_INITIALIZED');

    // Messages table
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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
    await this.db!.exec(`
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

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_channel_timestamp ON messages(channelId, timestamp DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(authorId, timestamp DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_provider ON messages(provider, timestamp DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_metrics_bot ON bot_metrics(botName, provider)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_sessions_active ON bot_sessions(isActive, channelId)`
    );

    // Bot configuration indexes
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_name ON bot_configurations(name)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_active ON bot_configurations(isActive)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_provider ON bot_configurations(messageProvider, llmProvider)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configurations_updated_at ON bot_configurations(updatedAt DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_config ON bot_configuration_versions(botConfigurationId, version DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_created_at ON bot_configuration_versions(createdAt DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_config ON bot_configuration_audit(botConfigurationId, performedAt DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_performed_at ON bot_configuration_audit(performedAt DESC)`
    );

    // Approval requests indexes
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_resource ON approval_requests(resourceType, resourceId)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requestedBy)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(createdAt DESC)`
    );
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant ON approval_requests(tenantId)`
    );

    // Anomalies indexes
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp DESC)`
    );
    await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_metric ON anomalies(metric)`);
    await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)`);
    await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON anomalies(resolved)`);
    await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_anomalies_tenant ON anomalies(tenantId)`);

    // AI Feedback indexes
    await this.db!.exec(
      `CREATE INDEX IF NOT EXISTS idx_ai_feedback_recommendation ON ai_feedback(recommendationId)`
    );

    debug('Database indexes created');
  }

  private async migrate(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Add tenantId columns to existing tables
      await this.db!.exec(`ALTER TABLE bot_configurations ADD COLUMN tenantId TEXT`);
      await this.db!.exec(`ALTER TABLE bot_configuration_versions ADD COLUMN tenantId TEXT`);
      await this.db!.exec(`ALTER TABLE bot_configuration_audit ADD COLUMN tenantId TEXT`);
      await this.db!.exec(`ALTER TABLE messages ADD COLUMN tenantId TEXT`);
      await this.db!.exec(`ALTER TABLE bot_sessions ADD COLUMN tenantId TEXT`);
      await this.db!.exec(`ALTER TABLE bot_metrics ADD COLUMN tenantId TEXT`);

      // Add RBAC enhancements to roles table
      await this.db!.exec(`ALTER TABLE roles ADD COLUMN description TEXT`);
      await this.db!.exec(`ALTER TABLE roles ADD COLUMN level INTEGER DEFAULT 0`);
      await this.db!.exec(`ALTER TABLE roles ADD COLUMN isActive BOOLEAN DEFAULT 1`);
      await this.db!.exec(
        `ALTER TABLE roles ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP`
      );
      await this.db!.exec(
        `ALTER TABLE roles ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP`
      );

      // Add indexes for tenantId
      await this.db!.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_configurations_tenant ON bot_configurations(tenantId)`
      );
      await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenantId)`);
      await this.db!.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_sessions_tenant ON bot_sessions(tenantId)`
      );
      await this.db!.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_metrics_tenant ON bot_metrics(tenantId)`
      );
      await this.db!.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_tenant ON bot_configuration_versions(tenantId)`
      );
      await this.db!.exec(
        `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_tenant ON bot_configuration_audit(tenantId)`
      );
      await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenantId)`);
      await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level)`);
      await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenantId)`);
      await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_audits_tenant ON audits(tenantId)`);
      await this.db!.exec(`CREATE INDEX IF NOT EXISTS idx_audits_user ON audits(userId)`);

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

  // ---------------------------------------------------------------------------
  // Message operations -- delegated to MessageRepository
  // ---------------------------------------------------------------------------

  async saveMessage(
    channelId: string,
    userId: string,
    content: string,
    provider = 'unknown'
  ): Promise<number> {
    return this.messageRepo.saveMessage(channelId, userId, content, provider);
  }

  async storeMessage(message: MessageRecord): Promise<number> {
    return this.messageRepo.storeMessage(message);
  }

  async getMessageHistory(channelId: string, limit = 10): Promise<MessageRecord[]> {
    return this.messageRepo.getMessageHistory(channelId, limit);
  }

  async getMessages(channelId: string, limit = 50, offset = 0): Promise<MessageRecord[]> {
    return this.messageRepo.getMessages(channelId, limit, offset);
  }

  async storeConversationSummary(summary: ConversationSummary): Promise<number> {
    return this.messageRepo.storeConversationSummary(summary);
  }

  async updateBotMetrics(metrics: BotMetrics): Promise<void> {
    return this.messageRepo.updateBotMetrics(metrics);
  }

  async getBotMetrics(botName?: string): Promise<BotMetrics[]> {
    return this.messageRepo.getBotMetrics(botName);
  }

  async getStats(): Promise<{
    totalMessages: number;
    totalChannels: number;
    totalAuthors: number;
    providers: Record<string, number>;
  }> {
    return this.messageRepo.getStats();
  }

  // ---------------------------------------------------------------------------
  // Bot Configuration operations -- delegated to BotConfigRepository
  // ---------------------------------------------------------------------------

  async createBotConfiguration(config: BotConfiguration): Promise<number> {
    return this.botConfigRepo.createBotConfiguration(config);
  }

  async getBotConfiguration(id: number): Promise<BotConfiguration | null> {
    return this.botConfigRepo.getBotConfiguration(id);
  }

  async getBotConfigurationsBulk(ids: number[]): Promise<BotConfiguration[]> {
    return this.botConfigRepo.getBotConfigurationsBulk(ids);
  }

  async getBotConfigurationByName(name: string): Promise<BotConfiguration | null> {
    return this.botConfigRepo.getBotConfigurationByName(name);
  }

  async getAllBotConfigurations(): Promise<BotConfiguration[]> {
    return this.botConfigRepo.getAllBotConfigurations();
  }

  async getAllBotConfigurationsWithDetails(): Promise<
    (BotConfiguration & {
      versions: BotConfigurationVersion[];
      auditLog: BotConfigurationAudit[];
    })[]
  > {
    return this.botConfigRepo.getAllBotConfigurationsWithDetails();
  }

  async updateBotConfiguration(id: number, config: Partial<BotConfiguration>): Promise<void> {
    return this.botConfigRepo.updateBotConfiguration(id, config);
  }

  async deleteBotConfiguration(id: number): Promise<boolean> {
    return this.botConfigRepo.deleteBotConfiguration(id);
  }

  async createBotConfigurationVersion(version: BotConfigurationVersion): Promise<number> {
    return this.botConfigRepo.createBotConfigurationVersion(version);
  }

  async getBotConfigurationVersions(
    botConfigurationId: number
  ): Promise<BotConfigurationVersion[]> {
    return this.botConfigRepo.getBotConfigurationVersions(botConfigurationId);
  }

  async getBotConfigurationVersionsBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationVersion[]>> {
    return this.botConfigRepo.getBotConfigurationVersionsBulk(botConfigurationIds);
  }

  async deleteBotConfigurationVersion(
    botConfigurationId: number,
    version: string
  ): Promise<boolean> {
    return this.botConfigRepo.deleteBotConfigurationVersion(botConfigurationId, version);
  }

  async createBotConfigurationAudit(audit: BotConfigurationAudit): Promise<number> {
    return this.botConfigRepo.createBotConfigurationAudit(audit);
  }

  async getBotConfigurationAudit(botConfigurationId: number): Promise<BotConfigurationAudit[]> {
    return this.botConfigRepo.getBotConfigurationAudit(botConfigurationId);
  }

  async getBotConfigurationAuditBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationAudit[]>> {
    return this.botConfigRepo.getBotConfigurationAuditBulk(botConfigurationIds);
  }

  // ---------------------------------------------------------------------------
  // Anomaly operations -- delegated to AnomalyRepository
  // ---------------------------------------------------------------------------

  async storeAnomaly(anomaly: Anomaly): Promise<void> {
    return this.anomalyRepo.storeAnomaly(anomaly);
  }

  async getAnomalies(tenantId?: string): Promise<Anomaly[]> {
    return this.anomalyRepo.getAnomalies(tenantId);
  }

  async getActiveAnomalies(tenantId?: string): Promise<Anomaly[]> {
    return this.anomalyRepo.getActiveAnomalies(tenantId);
  }

  async resolveAnomaly(id: string, tenantId?: string): Promise<boolean> {
    return this.anomalyRepo.resolveAnomaly(id, tenantId);
  }

  // ---------------------------------------------------------------------------
  // Approval operations -- delegated to ApprovalRepository
  // ---------------------------------------------------------------------------

  async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'createdAt'>): Promise<number> {
    return this.approvalRepo.createApprovalRequest(request);
  }

  async getApprovalRequest(id: number): Promise<ApprovalRequest | null> {
    return this.approvalRepo.getApprovalRequest(id);
  }

  async getApprovalRequests(
    resourceType?: string,
    resourceId?: number,
    status?: string
  ): Promise<ApprovalRequest[]> {
    return this.approvalRepo.getApprovalRequests(resourceType, resourceId, status);
  }

  async updateApprovalRequest(
    id: number,
    updates: Partial<
      Pick<ApprovalRequest, 'status' | 'reviewedBy' | 'reviewedAt' | 'reviewComments'>
    >
  ): Promise<boolean> {
    return this.approvalRepo.updateApprovalRequest(id, updates);
  }

  async deleteApprovalRequest(id: number): Promise<boolean> {
    return this.approvalRepo.deleteApprovalRequest(id);
  }

  // ---------------------------------------------------------------------------
  // AI Feedback operations -- delegated to AIFeedbackRepository
  // ---------------------------------------------------------------------------

  async storeAIFeedback(feedback: {
    recommendationId: string;
    feedback: string;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
    return this.aiFeedbackRepo.storeAIFeedback(feedback);
  }

  async clearAIFeedback(): Promise<number> {
    return this.aiFeedbackRepo.clearAIFeedback();
  }
}
