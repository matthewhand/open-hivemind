import 'reflect-metadata';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import Debug from 'debug';
import { open, type Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { injectable, singleton } from 'tsyringe';
import { ConfigurationError, DatabaseError } from '@src/types/errorClasses';

import { ActivityRepository } from './repositories/ActivityRepository';
import { BotRepository } from './repositories/BotRepository';
import { ConfigRepository } from './repositories/ConfigRepository';
import { SessionRepository } from './repositories/SessionRepository';

const debug = Debug('app:DatabaseManager');

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  path?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface MessageRecord {
  id?: number;
  messageId: string;
  channelId: string;
  content: string;
  authorId: string;
  authorName: string;
  timestamp: Date;
  provider: string;
  metadata?: Record<string, unknown>;
}

// Provider configuration interfaces for type safety
export interface DiscordConfig {
  channelId?: string;
  guildId?: string;
  token?: string;
  prefix?: string;
  intents?: string[];
}

export interface SlackConfig {
  botToken?: string;
  appToken?: string;
  signingSecret?: string;
  teamId?: string;
  channels?: string[];
}

export interface MattermostConfig {
  url?: string;
  accessToken?: string;
  teamId?: string;
  channelId?: string;
}

export interface OpenAIConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  organization?: string;
}

export interface FlowiseConfig {
  apiUrl?: string;
  apiKey?: string;
  chatflowId?: string;
}

export interface OpenWebUIConfig {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface OpenSwarmConfig {
  apiUrl?: string;
  apiKey?: string;
  swarmId?: string;
}

export interface PerplexityConfig {
  apiKey?: string;
  model?: string;
}

export interface ReplicateConfig {
  apiKey?: string;
  model?: string;
  version?: string;
}

export interface N8nConfig {
  apiUrl?: string;
  apiKey?: string;
  workflowId?: string;
}

export interface MCPCGuardConfig {
  enabled: boolean;
  type: 'owner' | 'custom';
  allowedUserIds?: string[];
}

// Union type for all provider configs
export type ProviderConfig =
  | DiscordConfig
  | SlackConfig
  | MattermostConfig
  | OpenAIConfig
  | FlowiseConfig
  | OpenWebUIConfig
  | OpenSwarmConfig
  | PerplexityConfig
  | ReplicateConfig
  | N8nConfig;

export interface ConversationSummary {
  id?: number;
  channelId: string;
  summary: string;
  messageCount: number;
  startTimestamp: Date;
  endTimestamp: Date;
  provider: string;
}

export interface BotMetrics {
  id?: number;
  botName: string;
  messagesSent: number;
  messagesReceived: number;
  conversationsHandled: number;
  averageResponseTime: number;
  lastActivity: Date;
  provider: string;
}

export interface BotConfiguration {
  id?: number;
  name: string;
  messageProvider: string;
  llmProvider: string;
  llmProfile?: string;
  responseProfile?: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: { name: string; serverUrl?: string }[] | string[] | string;
  mcpGuard?: MCPCGuardConfig | string;
  mcpGuardProfile?: string;
  discord?: DiscordConfig | string;
  slack?: SlackConfig | string;
  mattermost?: MattermostConfig | string;
  openai?: OpenAIConfig | string;
  flowise?: FlowiseConfig | string;
  openwebui?: OpenWebUIConfig | string;
  openswarm?: OpenSwarmConfig | string;
  perplexity?: PerplexityConfig | string;
  replicate?: ReplicateConfig | string;
  n8n?: N8nConfig | string;
  tenantId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface BotConfigurationVersion {
  id?: number;
  botConfigurationId: number;
  version: string;
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: { name: string; serverUrl?: string }[] | string[] | string;
  mcpGuard?: MCPCGuardConfig | string;
  discord?: DiscordConfig | string;
  slack?: SlackConfig | string;
  mattermost?: MattermostConfig | string;
  openai?: OpenAIConfig | string;
  flowise?: FlowiseConfig | string;
  openwebui?: OpenWebUIConfig | string;
  openswarm?: OpenSwarmConfig | string;
  perplexity?: PerplexityConfig | string;
  replicate?: ReplicateConfig | string;
  n8n?: N8nConfig | string;
  tenantId?: string;
  isActive: boolean;
  createdAt: Date;
  createdBy?: string;
  changeLog?: string;
}

export interface BotConfigurationAudit {
  id?: number;
  botConfigurationId: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
  oldValues?: string;
  newValues?: string;
  performedBy?: string;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  tenantId?: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
  maxBots: number;
  maxUsers: number;
  storageQuota: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  level: number;
  permissions: string[];
  isActive: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  roleId: number;
  tenantId: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuditEvent {
  id: number;
  timestamp: Date;
  userId: number;
  action: string;
  resource: string;
  resourceId?: string;
  tenantId: string;
  ipAddress: string;
  userAgent: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | 'debug';
  status: 'success' | 'failure' | 'pending';
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Anomaly {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  expectedMean: number;
  standardDeviation: number;
  zScore: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  resolved: boolean;
  tenantId?: string;
}

export interface ApprovalRequest {
  id?: number;
  resourceType: string;
  resourceId: number;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  requestedBy: string;
  diff?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewComments?: string;
  createdAt: Date;
  tenantId?: string;
}

export interface AIFeedback {
  id?: number;
  recommendationId: string;
  feedback: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@singleton()
@injectable()
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private config?: DatabaseConfig;
  private configured = false;
  private connected = false;
  private db: Database | null = null;

  public activityRepository: ActivityRepository;
  public botRepository: BotRepository;
  public configRepository: ConfigRepository;
  public sessionRepository: SessionRepository;

  constructor(config?: DatabaseConfig) {
    this.activityRepository = new ActivityRepository(null, () => this.isConnected());
    this.botRepository = new BotRepository(null, () => this.isConnected());
    this.configRepository = new ConfigRepository(null, () => this.isConnected());
    this.sessionRepository = new SessionRepository(null, () => this.isConnected());

    if (config) {
      this.configure(config);
    }
  }

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
      this.activityRepository.setDb(this.db);
      this.botRepository.setDb(this.db);
      this.configRepository.setDb(this.db);
      this.sessionRepository.setDb(this.db);
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

      // Add foreign keys if possible (SQLite limited, but for new DB ok)
      // Note: Foreign keys added only if table recreated; for existing, manual migration needed

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

  async disconnect(): Promise<void> {
    try {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
      this.connected = false;
      this.activityRepository.setDb(null);
      this.botRepository.setDb(null);
      this.configRepository.setDb(null);
      this.sessionRepository.setDb(null);
      debug('Database disconnected');
    } catch (error) {
      debug('Error disconnecting database:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async saveMessage(
    channelId: string,
    userId: string,
    content: string,
    provider = 'unknown'
  ): Promise<number> {
    return this.activityRepository.saveMessage(channelId, userId, content, provider);
  }

  async storeMessage(message: MessageRecord): Promise<number> {
    return this.activityRepository.storeMessage(message);
  }

  async getMessageHistory(channelId: string, limit = 10): Promise<MessageRecord[]> {
    return this.activityRepository.getMessageHistory(channelId, limit);
  }

  async getMessages(channelId: string, limit = 50, offset = 0): Promise<MessageRecord[]> {
    return this.activityRepository.getMessages(channelId, limit, offset);
  }

  async storeConversationSummary(summary: ConversationSummary): Promise<number> {
    return this.activityRepository.storeConversationSummary(summary);
  }

  async updateBotMetrics(metrics: BotMetrics): Promise<void> {
    return this.botRepository.updateBotMetrics(metrics);
  }

  async getBotMetrics(botName?: string): Promise<BotMetrics[]> {
    return this.botRepository.getBotMetrics(botName);
  }

  async getStats(): Promise<{
    totalMessages: number;
    totalChannels: number;
    totalAuthors: number;
    providers: Record<string, number>;
  }> {
    return this.activityRepository.getStats();
  }

  // Bot Configuration methods
  async createBotConfiguration(config: BotConfiguration): Promise<number> {
    return this.configRepository.createBotConfiguration(config);
  }

  async getBotConfiguration(id: number): Promise<BotConfiguration | null> {
    return this.configRepository.getBotConfiguration(id);
  }

  /**
   * Get multiple bot configurations by their IDs in a single query
   */
  async getBotConfigurationsBulk(ids: number[]): Promise<BotConfiguration[]> {
    return this.configRepository.getBotConfigurationsBulk(ids);
  }

  async getBotConfigurationByName(name: string): Promise<BotConfiguration | null> {
    return this.configRepository.getBotConfigurationByName(name);
  }

  async getAllBotConfigurations(): Promise<BotConfiguration[]> {
    return this.configRepository.getAllBotConfigurations();
  }

  /**
   * Get all bot configurations with their versions and audit logs in optimized bulk queries
   */
  async getAllBotConfigurationsWithDetails(): Promise<
    (BotConfiguration & {
      versions: BotConfigurationVersion[];
      auditLog: BotConfigurationAudit[];
    })[]
  > {
    return this.configRepository.getAllBotConfigurationsWithDetails();
  }

  async updateBotConfiguration(id: number, config: Partial<BotConfiguration>): Promise<void> {
    return this.configRepository.updateBotConfiguration(id, config);
  }

  async deleteBotConfiguration(id: number): Promise<boolean> {
    return this.configRepository.deleteBotConfiguration(id);
  }

  async createBotConfigurationVersion(version: BotConfigurationVersion): Promise<number> {
    return this.configRepository.createBotConfigurationVersion(version);
  }

  async getBotConfigurationVersions(
    botConfigurationId: number
  ): Promise<BotConfigurationVersion[]> {
    return this.configRepository.getBotConfigurationVersions(botConfigurationId);
  }

  /**
   * Get bot configuration versions for multiple configurations in a single query
   */
  async getBotConfigurationVersionsBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationVersion[]>> {
    return this.configRepository.getBotConfigurationVersionsBulk(botConfigurationIds);
  }

  async createBotConfigurationAudit(audit: BotConfigurationAudit): Promise<number> {
    return this.configRepository.createBotConfigurationAudit(audit);
  }

  async getBotConfigurationAudit(botConfigurationId: number): Promise<BotConfigurationAudit[]> {
    return this.configRepository.getBotConfigurationAudit(botConfigurationId);
  }

  /**
   * Get bot configuration audit logs for multiple configurations in a single query
   */
  async getBotConfigurationAuditBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationAudit[]>> {
    return this.configRepository.getBotConfigurationAuditBulk(botConfigurationIds);
  }

  async storeAnomaly(anomaly: Anomaly): Promise<void> {
    return this.activityRepository.storeAnomaly(anomaly);
  }

  async getAnomalies(tenantId?: string): Promise<Anomaly[]> {
    return this.activityRepository.getAnomalies(tenantId);
  }

  async getActiveAnomalies(tenantId?: string): Promise<Anomaly[]> {
    return this.activityRepository.getActiveAnomalies(tenantId);
  }

  async resolveAnomaly(id: string, tenantId?: string): Promise<boolean> {
    return this.activityRepository.resolveAnomaly(id, tenantId);
  }

  async deleteBotConfigurationVersion(
    botConfigurationId: number,
    version: string
  ): Promise<boolean> {
    return this.configRepository.deleteBotConfigurationVersion(botConfigurationId, version);
  }

  // Approval Request methods
  async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'createdAt'>): Promise<number> {
    return this.activityRepository.createApprovalRequest(request);
  }

  async getApprovalRequest(id: number): Promise<ApprovalRequest | null> {
    return this.activityRepository.getApprovalRequest(id);
  }

  async getApprovalRequests(
    resourceType?: string,
    resourceId?: number,
    status?: string
  ): Promise<ApprovalRequest[]> {
    return this.activityRepository.getApprovalRequests(resourceType, resourceId, status);
  }

  async updateApprovalRequest(
    id: number,
    updates: Partial<
      Pick<ApprovalRequest, 'status' | 'reviewedBy' | 'reviewedAt' | 'reviewComments'>
    >
  ): Promise<boolean> {
    return this.activityRepository.updateApprovalRequest(id, updates);
  }

  async deleteApprovalRequest(id: number): Promise<boolean> {
    return this.activityRepository.deleteApprovalRequest(id);
  }

  async storeAIFeedback(feedback: {
    recommendationId: string;
    feedback: string;
    metadata?: Record<string, unknown>;
  }): Promise<number> {
    return this.activityRepository.storeAIFeedback(feedback);
  }

  async clearAIFeedback(): Promise<number> {
    return this.activityRepository.clearAIFeedback();
  }
}
