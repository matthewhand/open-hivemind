import 'reflect-metadata';
import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';
import { ConfigurationError, DatabaseError } from '@src/types/errorClasses';
import databaseConfig from '@src/config/databaseConfig';
import { AIFeedbackRepository } from './repositories/AIFeedbackRepository';
import { AnomalyRepository } from './repositories/AnomalyRepository';
import { ApprovalRepository } from './repositories/ApprovalRepository';
import { BotConfigRepository } from './repositories/BotConfigRepository';
import { DecisionRepository } from './repositories/DecisionRepository';
import { MessageRepository } from './repositories/MessageRepository';
import { SQLiteWrapper } from './sqliteWrapper';
import { PostgresWrapper } from './postgresWrapper';
import type {
  Anomaly,
  ApprovalRequest,
  BotConfiguration,
  BotConfigurationAudit,
  BotConfigurationVersion,
  BotMetrics,
  ConversationSummary,
  DatabaseConfig,
  DecisionRecord,
  IDatabase,
  MessageRecord,
} from './types';

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
  IDatabase,
} from './types';

export type { Database } from './sqliteWrapper';

const debug = Debug('app:DatabaseManager');

@singleton()
@injectable()
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private config?: DatabaseConfig;
  private configured = false;
  private connected = false;
  private db: IDatabase | null = null;

  // Repositories
  private messageRepo!: MessageRepository;
  private botConfigRepo!: BotConfigRepository;
  private anomalyRepo!: AnomalyRepository;
  private approvalRepo!: ApprovalRepository;
  private aiFeedbackRepo!: AIFeedbackRepository;
  private decisionRepo!: DecisionRepository;

  constructor() {
    this.initRepositories();
    // Load config from databaseConfig (convict)
    const type = databaseConfig.get('DATABASE_TYPE') as 'sqlite' | 'postgres';
    if (type === 'sqlite') {
      this.configure({
        type: 'sqlite',
        path: databaseConfig.get('DATABASE_PATH'),
      });
    } else {
      this.configure({
        type: 'postgres',
        host: databaseConfig.get('DATABASE_HOST'),
        port: databaseConfig.get('DATABASE_PORT'),
        username: databaseConfig.get('DATABASE_USER'),
        password: databaseConfig.get('DATABASE_PASSWORD'),
        database: databaseConfig.get('DATABASE_NAME'),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Singleton / lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Gets the singleton instance of DatabaseManager.
   *
   * @param {DatabaseConfig} [config] - Optional database configuration to apply
   * @returns {DatabaseManager} The singleton instance
   */

  static getInstance(config?: DatabaseConfig): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    if (config) {
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

        this.db = new SQLiteWrapper(dbPath);
        debug('DATABASE_MANAGER: this.db initialized (SQLite)');
        
        await this.createTables();
        await this.createIndexes();
        await this.migrate();
      } else if (this.config.type === 'postgres') {
        const dbUrl = process.env.DATABASE_URL || databaseConfig.get('DATABASE_URL');
        if (dbUrl) {
          this.db = new PostgresWrapper(dbUrl);
        } else {
          this.db = new PostgresWrapper({
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
            ssl: databaseConfig.get('DATABASE_SSL') ? { rejectUnauthorized: false } : false,
          });
        }
        debug('DATABASE_MANAGER: this.db initialized (Postgres)');
        
        await this.createTables();
        await this.createIndexes();
        // Skip sqlite-specific migrations for postgres for now, 
        // or implement postgres-specific ones.
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
    const getDb = (): any => this.db ?? null;
    const isConn = (): boolean => this.connected;
    const ensure = (): void => this.ensureConnected();

    this.messageRepo = new MessageRepository(getDb, isConn, ensure);
    this.botConfigRepo = new BotConfigRepository(getDb, ensure);
    this.anomalyRepo = new AnomalyRepository(getDb, isConn);
    this.approvalRepo = new ApprovalRepository(getDb, ensure);
    this.aiFeedbackRepo = new AIFeedbackRepository(getDb, ensure);
    this.decisionRepo = new DecisionRepository(getDb, isConn);
  }

  // ---------------------------------------------------------------------------
  // Schema creation (private)
  // ---------------------------------------------------------------------------

  private async createTables(): Promise<void> {
    if (!this.db) throw new DatabaseError('Database not initialized', 'DATABASE_NOT_INITIALIZED');
    const db = this.db;
    const isPostgres = this.config?.type === 'postgres';

    const pk_auto = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    const text_type = isPostgres ? 'TEXT' : 'TEXT';
    const datetime_type = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    const default_now = isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

    // Messages table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id ${pk_auto},
        messageId TEXT NOT NULL,
        channelId TEXT NOT NULL,
        content TEXT NOT NULL,
        authorId TEXT NOT NULL,
        authorName TEXT NOT NULL,
        timestamp ${datetime_type} NOT NULL,
        provider TEXT NOT NULL,
        metadata TEXT,
        tenantId TEXT,
        created_at ${datetime_type} DEFAULT ${default_now}
      )
    `);

    // Conversation summaries table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_summaries (
        id ${pk_auto},
        channelId TEXT NOT NULL,
        summary TEXT NOT NULL,
        messageCount INTEGER NOT NULL,
        startTimestamp ${datetime_type} NOT NULL,
        endTimestamp ${datetime_type} NOT NULL,
        provider TEXT NOT NULL,
        created_at ${datetime_type} DEFAULT ${default_now}
      )
    `);

    // Bot metrics table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_metrics (
        id ${pk_auto},
        botName TEXT NOT NULL,
        messagesSent INTEGER DEFAULT 0,
        messagesReceived INTEGER DEFAULT 0,
        conversationsHandled INTEGER DEFAULT 0,
        averageResponseTime REAL DEFAULT 0,
        lastActivity ${datetime_type},
        provider TEXT NOT NULL,
        tenantId TEXT,
        created_at ${datetime_type} DEFAULT ${default_now},
        updated_at ${datetime_type} DEFAULT ${default_now}
      )
    `);
    
    // Add unique constraint for bot_metrics in postgres if needed for INSERT OR REPLACE emulation
    if (isPostgres) {
       try { await db.exec('ALTER TABLE bot_metrics ADD CONSTRAINT bot_metrics_name_unique UNIQUE (botName)'); } catch(e) {}
    }

    // Bot sessions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_sessions (
        id ${pk_auto},
        sessionId TEXT UNIQUE NOT NULL,
        botName TEXT NOT NULL,
        channelId TEXT NOT NULL,
        provider TEXT NOT NULL,
        startTime ${datetime_type} NOT NULL,
        endTime ${datetime_type},
        messageCount INTEGER DEFAULT 0,
        isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
        tenantId TEXT,
        created_at ${datetime_type} DEFAULT ${default_now}
      )
    `);

    // Bot configurations table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_configurations (
        id ${pk_auto},
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
        tenantId TEXT,
        isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
        createdAt ${datetime_type} DEFAULT ${default_now},
        updatedAt ${datetime_type} DEFAULT ${default_now},
        createdBy TEXT,
        updatedBy TEXT
      )
    `);

    // Bot configuration versions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_configuration_versions (
        id ${pk_auto},
        botConfigurationId INTEGER NOT NULL,
        version TEXT NOT NULL,
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
        tenantId TEXT,
        isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
        createdAt ${datetime_type} DEFAULT ${default_now},
        createdBy TEXT,
        changeLog TEXT
      )
    `);

    // Bot configuration audit table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bot_configuration_audit (
        id ${pk_auto},
        botConfigurationId INTEGER NOT NULL,
        action TEXT NOT NULL,
        oldValues TEXT,
        newValues TEXT,
        performedBy TEXT,
        performedAt ${datetime_type} DEFAULT ${default_now},
        ipAddress TEXT,
        userAgent TEXT,
        tenantId TEXT
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
        features TEXT,
        isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
        createdAt ${datetime_type} DEFAULT ${default_now},
        expiresAt ${datetime_type}
      )
    `);

    // Roles table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id ${pk_auto},
        name TEXT NOT NULL,
        description TEXT,
        level INTEGER DEFAULT 0,
        permissions TEXT,
        isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
        tenantId TEXT NOT NULL,
        createdAt ${datetime_type} DEFAULT ${default_now},
        updatedAt ${datetime_type} DEFAULT ${default_now}
      )
    `);

    // Users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id ${pk_auto},
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        roleId INTEGER,
        tenantId TEXT NOT NULL,
        isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
        createdAt ${datetime_type} DEFAULT ${default_now},
        lastLogin ${datetime_type}
      )
    `);

    // Audits table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS audits (
        id ${pk_auto},
        timestamp ${datetime_type} DEFAULT ${default_now},
        userId INTEGER,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resourceId TEXT,
        tenantId TEXT NOT NULL,
        ipAddress TEXT,
        userAgent TEXT,
        severity TEXT DEFAULT 'info',
        status TEXT DEFAULT 'success',
        details TEXT,
        metadata TEXT
      )
    `);

    // Approval requests table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id ${pk_auto},
        resourceType TEXT NOT NULL,
        resourceId INTEGER NOT NULL,
        changeType TEXT NOT NULL,
        requestedBy TEXT NOT NULL,
        diff TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewedBy TEXT,
        reviewedAt ${datetime_type},
        reviewComments TEXT,
        createdAt ${datetime_type} DEFAULT ${default_now},
        tenantId TEXT
      )
    `);

    // Anomalies table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        timestamp ${datetime_type} NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        expectedMean REAL NOT NULL,
        standardDeviation REAL NOT NULL,
        zScore REAL NOT NULL,
        threshold REAL NOT NULL,
        severity TEXT NOT NULL,
        explanation TEXT NOT NULL,
        resolved BOOLEAN DEFAULT ${isPostgres ? 'FALSE' : '0'},
        tenantId TEXT,
        created_at ${datetime_type} DEFAULT ${default_now}
      )
    `);

    // AI Feedback table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ai_feedback (
        id ${pk_auto},
        recommendationId TEXT NOT NULL,
        feedback TEXT NOT NULL,
        timestamp ${datetime_type} DEFAULT ${default_now},
        metadata TEXT
      )
    `);

    // Decisions table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS decisions (
        id ${pk_auto},
        botName TEXT,
        shouldReply BOOLEAN,
        reason TEXT,
        probabilityRoll REAL,
        threshold REAL,
        timestamp TEXT
      )
    `);

    // Logs table for database persistence
    await db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id ${pk_auto},
        timestamp ${datetime_type} DEFAULT ${default_now},
        level TEXT NOT NULL,
        context TEXT,
        message TEXT NOT NULL,
        details TEXT,
        metadata TEXT
      )
    `);

    debug('Database tables created');
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const db = this.db;

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

    // Logs indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`);

    debug('Database indexes created');
  }

  private async migrate(): Promise<void> {
    if (!this.db || this.config?.type === 'postgres') return; 
    const db = this.db;

    try {
      // SQLite specific migration additions
      await db.exec(`ALTER TABLE bot_configurations ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_configuration_versions ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_configuration_audit ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE messages ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_sessions ADD COLUMN tenantId TEXT`);
      await db.exec(`ALTER TABLE bot_metrics ADD COLUMN tenantId TEXT`);

      debug('Database migration completed');
    } catch (error) {
      if ((error as Error).message.includes('duplicate column name')) {
        debug('Some columns already exist, skipping');
      } else {
        debug('Migration error:', error);
        throw error;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Log operations
  // ---------------------------------------------------------------------------

  async saveLog(log: {
    level: string;
    message: string;
    context?: string;
    details?: any;
    metadata?: any;
  }): Promise<void> {
    if (!this.db || !this.connected) return;

    try {
      await this.db.run(
        `INSERT INTO logs (level, context, message, details, metadata) VALUES (?, ?, ?, ?, ?)`,
        [
          log.level,
          log.context || null,
          log.message,
          log.details ? JSON.stringify(log.details) : null,
          log.metadata ? JSON.stringify(log.metadata) : null,
        ]
      );
    } catch (error) {
      // Don't throw here to avoid infinite log loops if DB fails
      console.error('Failed to save log to database:', error);
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
  ): Promise<number | string> {
    return this.messageRepo.saveMessage(channelId, userId, content, provider);
  }

  async storeMessage(message: MessageRecord): Promise<number | string> {
    return this.messageRepo.storeMessage(message);
  }

  async getMessageHistory(channelId: string, limit = 10): Promise<MessageRecord[]> {
    return this.messageRepo.getMessageHistory(channelId, limit);
  }

  async getMessages(channelId: string, limit = 50, offset = 0): Promise<MessageRecord[]> {
    return this.messageRepo.getMessages(channelId, limit, offset);
  }

  async storeConversationSummary(summary: ConversationSummary): Promise<number | string> {
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
  }): Promise<number | string> {
    return this.aiFeedbackRepo.storeAIFeedback(feedback);
  }

  async clearAIFeedback(): Promise<number> {
    return this.aiFeedbackRepo.clearAIFeedback();
  }

  // ---------------------------------------------------------------------------
  // Decision operations -- delegated to DecisionRepository
  // ---------------------------------------------------------------------------

  async saveDecision(decision: DecisionRecord): Promise<void> {
    return this.decisionRepo.saveDecision(decision);
  }

  async getRecentDecisions(limit = 100): Promise<DecisionRecord[]> {
    return this.decisionRepo.getRecentDecisions(limit);
  }
}
