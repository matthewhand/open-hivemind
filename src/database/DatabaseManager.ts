import 'reflect-metadata';
import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';
import databaseConfig from '@src/config/databaseConfig';
import { ConfigurationError, DatabaseError } from '@src/types/errorClasses';
import { PostgresWrapper } from './postgresWrapper';
import { ActivityRepository, type ActivityLog } from './repositories/ActivityRepository';
import { AIFeedbackRepository } from './repositories/AIFeedbackRepository';
import { AnomalyRepository } from './repositories/AnomalyRepository';
import { ApprovalRepository } from './repositories/ApprovalRepository';
import { BotConfigRepository } from './repositories/BotConfigRepository';
import { DecisionRepository } from './repositories/DecisionRepository';
import { InferenceRepository, type InferenceLog } from './repositories/InferenceRepository';
import { MemoryRepository } from './repositories/MemoryRepository';
import { MessageRepository } from './repositories/MessageRepository';
import { ActivitySchemas } from './schemas/ActivitySchemas';
import { SQLiteWrapper } from './sqliteWrapper';
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
  InferenceLog,
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
  private activityRepo!: ActivityRepository;
  private inferenceRepo!: InferenceRepository;
  private memoryRepo!: MemoryRepository;

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

        // Enable pgvector extension
        try {
          await this.db.exec('CREATE EXTENSION IF NOT EXISTS vector');
          debug('DATABASE_MANAGER: pgvector extension enabled');
        } catch (e) {
          debug(
            'DATABASE_MANAGER: failed to enable pgvector (might already exist or permission denied):',
            e
          );
        }

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

      // Trigger automatic cleanup on startup if enabled
      if (databaseConfig.get('AUTO_CLEANUP_ON_STARTUP')) {
        this.runFullCleanup().catch((err) => {
          debug('Automatic startup cleanup failed:', err);
        });
      }
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
    const isPg = (): boolean => this.config?.type === 'postgres';

    this.messageRepo = new MessageRepository(getDb, isConn, ensure);
    this.botConfigRepo = new BotConfigRepository(getDb, ensure);
    this.anomalyRepo = new AnomalyRepository(getDb, isConn);
    this.approvalRepo = new ApprovalRepository(getDb, ensure);
    this.aiFeedbackRepo = new AIFeedbackRepository(getDb, ensure);
    this.decisionRepo = new DecisionRepository(getDb, isConn);
    this.activityRepo = new ActivityRepository(getDb, isConn);
    this.inferenceRepo = new InferenceRepository(getDb, isConn);
    this.memoryRepo = new MemoryRepository(getDb, isConn, isPg);
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
        direction TEXT,
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
      try {
        await db.exec(
          'ALTER TABLE bot_metrics ADD CONSTRAINT bot_metrics_name_unique UNIQUE (botName)'
        );
      } catch (e) {}
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

    // Inference logs table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS inference_logs (
        id ${pk_auto},
        botName TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT,
        tokensUsed INTEGER,
        latencyMs INTEGER,
        provider TEXT,
        status TEXT,
        errorMessage TEXT,
        timestamp ${datetime_type} DEFAULT ${default_now}
      )
    `);

    // Vector Memories table
    // For Postgres we use the 'vector' type from pgvector.
    // For SQLite we store the embedding as a JSON string for now.
    const embedding_col = isPostgres ? 'embedding vector(1536)' : 'embedding TEXT';
    await db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
        content TEXT NOT NULL,
        metadata TEXT,
        userId TEXT,
        agentId TEXT,
        sessionId TEXT,
        ${embedding_col},
        created_at ${datetime_type} DEFAULT ${default_now}
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

    // Create activity tables from schema module
    const activitySchemas = new ActivitySchemas();
    await activitySchemas.createTables(db);
    await activitySchemas.createIndexes(db);

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

    // Inference indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_inference_bot ON inference_logs(botName)`);
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_inference_timestamp ON inference_logs(timestamp DESC)`
    );

    // Memory indexes
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(userId)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agentId)`);

    if (this.config?.type === 'postgres') {
      try {
        // HNSW index for vector similarity search (cosine distance)
        await db.exec(
          `CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops)`
        );
      } catch (e) {
        debug('DATABASE_MANAGER: failed to create HNSW index (might need pgvector 0.5+):', e);
      }
    }

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
      await db.exec(`ALTER TABLE messages ADD COLUMN direction TEXT`);
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

  // ---------------------------------------------------------------------------
  // Activity operations -- delegated to ActivityRepository
  // ---------------------------------------------------------------------------

  async logActivity(activity: ActivityLog): Promise<number | string> {
    return this.activityRepo.logActivity(activity);
  }

  async logMessageActivity(log: {
    bot_id?: string;
    channel_id: string;
    user_id: string;
    message: string;
    response?: string;
  }): Promise<number | string> {
    return this.activityRepo.logMessageActivity(log);
  }

  async logAudit(audit: {
    bot_id: string;
    action: string;
    user_id?: string;
    old_values?: string;
    new_values?: string;
  }): Promise<number | string> {
    return this.activityRepo.logAudit(audit);
  }

  // ---------------------------------------------------------------------------
  // Inference operations -- delegated to InferenceRepository
  // ---------------------------------------------------------------------------

  async logInference(log: InferenceLog): Promise<number | string> {
    if (!databaseConfig.get('PERSIST_INFERENCE')) return 0;
    return this.inferenceRepo.logInference(log);
  }

  // ---------------------------------------------------------------------------
  // Memory operations -- delegated to MemoryRepository
  // ---------------------------------------------------------------------------

  async addMemory(record: MemoryRecord): Promise<number | string> {
    return this.memoryRepo.addMemory(record);
  }

  async searchMemories(
    embedding: number[],
    options: { limit?: number; userId?: string; agentId?: string } = {}
  ): Promise<(MemoryRecord & { score: number })[]> {
    return this.memoryRepo.searchMemories(embedding, options);
  }

  async getMemories(
    options: { limit?: number; userId?: string; agentId?: string } = {}
  ): Promise<MemoryRecord[]> {
    return this.memoryRepo.getMemories(options);
  }

  async deleteMemory(id: string | number): Promise<boolean> {
    return this.memoryRepo.deleteMemory(id);
  }

  async deleteAllMemories(options: { userId?: string; agentId?: string } = {}): Promise<void> {
    return this.memoryRepo.deleteAll(options);
  }

  /**
   * Reset the database by clearing all major tables.
   * This is a destructive operation used for "Factory Reset".
   */
  async resetDatabase(): Promise<void> {
    if (!this.db || !this.connected) throw new Error('Database not connected');
    const db = this.db;

    const tables = [
      'messages',
      'conversation_summaries',
      'bot_metrics',
      'bot_sessions',
      'bot_configurations',
      'bot_configuration_versions',
      'bot_configuration_audit',
      'tenants',
      'roles',
      'users',
      'audits',
      'approval_requests',
      'anomalies',
      'ai_feedback',
      'decisions',
      'logs',
      'inference_logs',
      'memories',
      'activity_logs',
      'message_logs',
      'bot_audit_logs',
      'bot_error_logs',
    ];

    debug('Starting factory reset (nuke)...');

    // Disable foreign key checks for the nuke to avoid dependency issues
    if (this.config?.type === 'sqlite') {
      await db.exec('PRAGMA foreign_keys = OFF');
    } else if (this.config?.type === 'postgres') {
      await db.exec('SET CONSTRAINTS ALL DEFERRED');
    }

    for (const table of tables) {
      try {
        console.log(`Clearing ${table}...`);
        await db.run(`DELETE FROM ${table}`);
      } catch (e) {
        debug(`Failed to clear table ${table}:`, e);
      }
    }

    // Re-enable foreign key checks
    if (this.config?.type === 'sqlite') {
      await db.exec('PRAGMA foreign_keys = ON');
    }

    debug('Factory reset completed.');
  }

  // ---------------------------------------------------------------------------
  // Cleanup operations
  // ---------------------------------------------------------------------------

  async cleanupTableByDate(
    tableName: string,
    days: number,
    dateColumn = 'timestamp'
  ): Promise<number> {
    if (!this.db || !this.connected) return 0;

    const isPostgres = this.config?.type === 'postgres';
    let sql: string;

    if (isPostgres) {
      sql = `DELETE FROM ${tableName} WHERE ${dateColumn} < NOW() - INTERVAL '${days} days'`;
    } else {
      sql = `DELETE FROM ${tableName} WHERE ${dateColumn} < datetime('now', '-${days} days')`;
    }

    try {
      const result = await this.db.run(sql);
      debug(`Cleaned up ${result.changes} rows from ${tableName} (by date)`);
      return result.changes;
    } catch (error) {
      debug(`Error cleaning up table ${tableName}:`, error);
      return 0;
    }
  }

  async cleanupTableByRows(tableName: string, maxRows: number): Promise<number> {
    if (!this.db || !this.connected) return 0;

    // Subquery to find IDs to keep
    // Note: This assumes 'id' is the primary key and rows are ordered by timestamp or id
    const sql = `
      DELETE FROM ${tableName}
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM ${tableName}
          ORDER BY id DESC
          LIMIT ?
        ) AS tmp
      )
    `;

    try {
      const result = await this.db.run(sql, [maxRows]);
      debug(`Cleaned up ${result.changes} rows from ${tableName} (by row count)`);
      return result.changes;
    } catch (error) {
      debug(`Error cleaning up table ${tableName}:`, error);
      return 0;
    }
  }

  private getRetentionLimits(): { days: number; maxRows: number } {
    const autoRetention = databaseConfig.get('AUTO_RETENTION');
    let days = databaseConfig.get('LOG_RETENTION_DAYS');
    let maxRows = databaseConfig.get('MAX_HISTORY_ROWS');

    if (autoRetention) {
      if (this.config?.type === 'sqlite' && this.config.path === ':memory:') {
        // Lite: Miniscule retention for RAM efficiency
        days = 1;
        maxRows = 100;
        debug('Applying LITE retention limits (1 day, 100 rows)');
      } else if (this.config?.type === 'postgres') {
        // Cloud: Limited retention for Neon Free Tier (0.5 GB limit)
        days = 7;
        maxRows = 1000;
        debug('Applying CLOUD retention limits (7 days, 1000 rows)');
      } else {
        // Standard: Regular disk settings
        debug(`Applying STANDARD retention limits (${days} days, ${maxRows} rows)`);
      }
    }

    return { days, maxRows };
  }

  async runFullCleanup(): Promise<void> {
    const { days, maxRows } = this.getRetentionLimits();

    const tables = [
      { name: 'messages', dateCol: 'timestamp' },
      { name: 'logs', dateCol: 'timestamp' },
      { name: 'bot_configuration_audit', dateCol: 'performedAt' },
      { name: 'activity_logs', dateCol: 'timestamp' },
      { name: 'message_logs', dateCol: 'timestamp' },
      { name: 'bot_audit_logs', dateCol: 'timestamp' },
      { name: 'bot_error_logs', dateCol: 'timestamp' },
      { name: 'audits', dateCol: 'timestamp' },
      { name: 'inference_logs', dateCol: 'timestamp' },
      { name: 'memories', dateCol: 'created_at' },
    ];

    debug(`Running full database cleanup: retention=${days}d, maxRows=${maxRows}`);

    for (const table of tables) {
      try {
        await this.cleanupTableByDate(table.name, days, table.dateCol);
        await this.cleanupTableByRows(table.name, maxRows);
      } catch (e) {
        debug(`Failed to cleanup table ${table.name}:`, e);
      }
    }
  }
}
