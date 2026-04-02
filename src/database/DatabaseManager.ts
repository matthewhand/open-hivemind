import 'reflect-metadata';
import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';
import { AIFeedbackRepository } from './AIFeedbackRepository';
import { AnomalyRepository } from './AnomalyRepository';
import { ApprovalRepository } from './ApprovalRepository';
import { BotConfigRepository } from './BotConfigRepository';
import { ConnectionPool } from './connectionPool';
import { MessageRepository } from './MessageRepository';
import type {
  Anomaly,
  ApprovalRequest,
  BotConfiguration,
  BotConfigurationAudit,
  BotConfigurationVersion,
  BotMetrics,
  ConversationSummary,
  DatabaseConfig,
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
} from './types';

const debug = Debug('app:DatabaseManager');

@singleton()
@injectable()
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private connectionPool: ConnectionPool;

  // Repositories
  private messageRepo!: MessageRepository;
  private botConfigRepo!: BotConfigRepository;
  private anomalyRepo!: AnomalyRepository;
  private approvalRepo!: ApprovalRepository;
  private aiFeedbackRepo!: AIFeedbackRepository;

  constructor(config?: DatabaseConfig) {
    this.connectionPool = new ConnectionPool(config);
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
    this.connectionPool.configure(config);
  }

  isConfigured(): boolean {
    return this.connectionPool.isConfigured();
  }

  async connect(): Promise<void> {
    const db = await this.connectionPool.connect();
    if (db) {
      // If we connected successfully, initialize the schema
      await QueryBuilder.initializeSchema(db);
    }
  }

  async disconnect(): Promise<void> {
    await this.connectionPool.disconnect();
  }

  isConnected(): boolean {
    return this.connectionPool.isConnected();
  }

  // ---------------------------------------------------------------------------
  // Repository initialisation
  // ---------------------------------------------------------------------------

  private initRepositories(): void {
    const getDb = () => this.connectionPool.getDb();
    const isConn = () => this.connectionPool.isConnected();
    const ensure = () => this.connectionPool.ensureConnected();

    this.messageRepo = new MessageRepository(getDb, isConn, ensure);
    this.botConfigRepo = new BotConfigRepository(getDb, ensure);
    this.anomalyRepo = new AnomalyRepository(getDb, isConn);
    this.approvalRepo = new ApprovalRepository(getDb, ensure);
    this.aiFeedbackRepo = new AIFeedbackRepository(getDb, ensure);
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
