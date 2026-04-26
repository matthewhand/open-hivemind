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
import { ActivityRepository, ActivityLog } from './repositories/ActivityRepository';
import { InferenceRepository } from './repositories/InferenceRepository';
import { MemoryRepository } from './repositories/MemoryRepository';
import { ActivitySchemas } from './schemas/ActivitySchemas';
import { SQLiteWrapper } from './sqliteWrapper';
import { PostgresWrapper } from './postgresWrapper';
import { runMigrations } from './migrationRunner';
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
  MemoryRecord,
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
        
        await runMigrations(this.db, false);
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
        
        await runMigrations(this.db, true);
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

  async getMemories(options: { limit?: number; userId?: string; agentId?: string } = {}): Promise<MemoryRecord[]> {
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
      'bot_error_logs'
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

  async cleanupTableByDate(tableName: string, days: number, dateColumn = 'timestamp'): Promise<number> {
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
      console.error(`Error cleaning up table ${tableName}:`, error);
      debug(`Error cleaning up table ${tableName}:`, error);
      return 0;
    }
  }

  async cleanupTableByRows(tableName: string, maxRows: number): Promise<number> {
    if (!this.db || !this.connected) return 0;

    try {
      // Find the cutoff ID using an index-optimized query
      // OFFSET is maxRows, meaning we want the ID of the (maxRows + 1)th newest row
      const cutoffRow = await this.db.get(`SELECT id FROM ${tableName} ORDER BY id DESC LIMIT 1 OFFSET ?`, [maxRows]);
      
      // If we have fewer rows than maxRows, or no rows, there's nothing to delete
      if (!cutoffRow || !cutoffRow.id) return 0;
      
      // Execute a fast range deletion
      const result = await this.db.run(`DELETE FROM ${tableName} WHERE id <= ?`, [cutoffRow.id]);
      debug(`Cleaned up ${result.changes} rows from ${tableName} (by row count)`);
      return result.changes;
    } catch (error) {
      console.error(`Error cleaning up table ${tableName}:`, error);
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
        console.error(`Failed to cleanup table ${table.name}:`, e);
        debug(`Failed to cleanup table ${table.name}:`, e);
      }
    }
  }
}
