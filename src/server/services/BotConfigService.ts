import Debug from 'debug';
import {
  DatabaseManager,
  type BotConfiguration,
  type BotConfigurationAudit,
  type BotConfigurationVersion,
} from '../../database/DatabaseManager';
import { ConfigurationError } from '../../types/errorClasses';
import { ConfigurationValidator, type BotConfig } from './ConfigurationValidator';

const debug = Debug('app:BotConfigService');

export interface CreateBotConfigRequest {
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: string | string[];
  mcpGuard?: {
    enabled: boolean;
    type: 'owner' | 'custom';
    allowedUserIds?: string[];
  };
  discord?: {
    token: string;
    clientId?: string;
    guildId?: string;
    channelId?: string;
    voiceChannelId?: string;
  };
  slack?: {
    botToken: string;
    appToken?: string;
    signingSecret: string;
    joinChannels?: string;
    defaultChannelId?: string;
    mode?: 'socket' | 'rtm';
  };
  mattermost?: {
    serverUrl: string;
    token: string;
    teamId?: string;
    channelId?: string;
  };
  openai?: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  flowise?: {
    apiKey: string;
    endpoint: string;
    chatflowId?: string;
  };
  openwebui?: {
    apiKey: string;
    endpoint: string;
    model?: string;
  };
  openswarm?: {
    apiKey: string;
    endpoint: string;
    agentId?: string;
  };
}

export interface UpdateBotConfigRequest extends Partial<CreateBotConfigRequest> {
  isActive?: boolean;
}

export interface BotConfigResponse extends BotConfiguration {
  versions?: BotConfigurationVersion[];
  auditLog?: BotConfigurationAudit[];
}

export class BotConfigService {
  private static instance: BotConfigService;
  private dbManager: DatabaseManager;
  private configValidator: ConfigurationValidator;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.configValidator = new ConfigurationValidator();
  }

  private ensureDatabaseEnabled(action: string): void {
    if (!this.dbManager.isConfigured()) {
      throw new ConfigurationError(`Database is not configured. Unable to ${action}.`, 'database');
    }
  }

  public static getInstance(): BotConfigService {
    if (!BotConfigService.instance) {
      BotConfigService.instance = new BotConfigService();
    }
    return BotConfigService.instance;
  }

  /**
   * Create a new bot configuration
   */
  async createBotConfig(
    configData: CreateBotConfigRequest,
    createdBy?: string
  ): Promise<BotConfigResponse> {
    try {
      this.ensureDatabaseEnabled('create bot configurations');

      // Validate configuration
      const validationResult = this.configValidator.validateBotConfig(configData);
      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check if bot name already exists
      const existingConfig = await this.dbManager.getBotConfigurationByName(configData.name);
      if (existingConfig) {
        throw new Error(`Bot configuration with name '${configData.name}' already exists`);
      }

      // Serialize configuration data
      const botConfig: BotConfiguration = {
        name: configData.name,
        messageProvider: configData.messageProvider,
        llmProvider: configData.llmProvider,
        persona: configData.persona,
        systemInstruction: configData.systemInstruction,
        mcpServers: Array.isArray(configData.mcpServers)
          ? JSON.stringify(configData.mcpServers)
          : configData.mcpServers,
        mcpGuard: configData.mcpGuard ? JSON.stringify(configData.mcpGuard) : undefined,
        discord: configData.discord ? JSON.stringify(configData.discord) : undefined,
        slack: configData.slack ? JSON.stringify(configData.slack) : undefined,
        mattermost: configData.mattermost ? JSON.stringify(configData.mattermost) : undefined,
        openai: configData.openai ? JSON.stringify(configData.openai) : undefined,
        flowise: configData.flowise ? JSON.stringify(configData.flowise) : undefined,
        openwebui: configData.openwebui ? JSON.stringify(configData.openwebui) : undefined,
        openswarm: configData.openswarm ? JSON.stringify(configData.openswarm) : undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy,
        updatedBy: createdBy,
      };

      // Create configuration in database
      const configId = await this.dbManager.createBotConfiguration(botConfig);

      // Create audit log
      await this.dbManager.createBotConfigurationAudit({
        botConfigurationId: configId,
        action: 'CREATE',
        newValues: JSON.stringify(configData),
        performedBy: createdBy,
        performedAt: new Date(),
      });

      // Get the created configuration
      const createdConfig = await this.dbManager.getBotConfiguration(configId);
      if (!createdConfig) {
        throw new Error('Failed to retrieve created bot configuration');
      }

      debug(`Bot configuration created: ${configData.name} (ID: ${configId})`);
      return createdConfig;
    } catch (error) {
      debug('Error creating bot configuration:', error);
      throw error;
    }
  }

  /**
   * Get a bot configuration by ID
   */
  async getBotConfig(id: number): Promise<BotConfigResponse | null> {
    try {
      this.ensureDatabaseEnabled('retrieve bot configurations');

      const config = await this.dbManager.getBotConfiguration(id);
      if (!config) {
        return null;
      }

      return {
        ...config,
        versions: await this.dbManager.getBotConfigurationVersions(id),
        auditLog: await this.dbManager.getBotConfigurationAudit(id),
      };
    } catch (error) {
      debug('Error getting bot configuration:', error);
      throw error;
    }
  }

  /**
   * Get a bot configuration by name
   */
  async getBotConfigByName(name: string): Promise<BotConfigResponse | null> {
    try {
      this.ensureDatabaseEnabled('retrieve bot configurations');

      const config = await this.dbManager.getBotConfigurationByName(name);
      if (!config) {
        return null;
      }

      return {
        ...config,
        versions: await this.dbManager.getBotConfigurationVersions(config.id!),
        auditLog: await this.dbManager.getBotConfigurationAudit(config.id!),
      };
    } catch (error) {
      debug('Error getting bot configuration by name:', error);
      throw error;
    }
  }

  /**
   * Get all bot configurations (optimized with bulk queries)
   */
  async getAllBotConfigs(): Promise<BotConfigResponse[]> {
    try {
      this.ensureDatabaseEnabled('list bot configurations');

      // Use optimized bulk query method - reduces from 1+2N queries to just 3 queries total
      return await this.dbManager.getAllBotConfigurationsWithDetails();
    } catch (error) {
      debug('Error getting all bot configurations:', error);
      throw error;
    }
  }

  /**
   * Get bot configurations filtered by message provider
   */
  async getBotConfigsByProvider(provider: string): Promise<BotConfigResponse[]> {
    try {
      this.ensureDatabaseEnabled('list bot configurations by provider');
      const allConfigs = await this.getAllBotConfigs();
      return allConfigs.filter(config => config.messageProvider === provider);
    } catch (error) {
      debug('Error getting bot configurations by provider:', error);
      throw error;
    }
  }

  /**
   * Update a bot configuration
   */
  async updateBotConfig(
    id: number,
    updates: UpdateBotConfigRequest,
    updatedBy?: string
  ): Promise<BotConfigResponse> {
    try {
      this.ensureDatabaseEnabled('update bot configurations');

      // Get existing configuration
      const existingConfig = await this.dbManager.getBotConfiguration(id);
      if (!existingConfig) {
        throw new Error(`Bot configuration with ID ${id} not found`);
      }

      // Validate updated configuration
      const updatedConfigData: BotConfig = {
        name: updates.name ?? existingConfig.name,
        messageProvider: updates.messageProvider ?? existingConfig.messageProvider,
        llmProvider: updates.llmProvider ?? existingConfig.llmProvider,
        persona: updates.persona ?? existingConfig.persona,
        systemInstruction: updates.systemInstruction ?? existingConfig.systemInstruction,
        mcpServers: updates.mcpServers ?? existingConfig.mcpServers,
        mcpGuard: updates.mcpGuard ? JSON.stringify(updates.mcpGuard) : existingConfig.mcpGuard,
        discord: updates.discord
          ? JSON.stringify(updates.discord)
          : (existingConfig.discord as any),
        slack: updates.slack ? JSON.stringify(updates.slack) : (existingConfig.slack as any),
        mattermost: updates.mattermost
          ? JSON.stringify(updates.mattermost)
          : (existingConfig.mattermost as any),
        openai: updates.openai ? JSON.stringify(updates.openai) : (existingConfig.openai as any),
        flowise: updates.flowise
          ? JSON.stringify(updates.flowise)
          : (existingConfig.flowise as any),
        openwebui: updates.openwebui
          ? JSON.stringify(updates.openwebui)
          : (existingConfig.openwebui as any),
        openswarm: updates.openswarm
          ? JSON.stringify(updates.openswarm)
          : (existingConfig.openswarm as any),
        isActive: updates.isActive ?? existingConfig.isActive,
        createdAt: existingConfig.createdAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validationResult = this.configValidator.validateBotConfig(updatedConfigData);
      if (!validationResult.isValid) {
        throw new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Update configuration in database
      const updateData: any = {
        updatedAt: new Date(),
        updatedBy,
      };

      if (updates.mcpGuard !== undefined) {
        updateData.mcpGuard = updates.mcpGuard
          ? JSON.stringify(updates.mcpGuard)
          : existingConfig.mcpGuard;
      }
      if (updates.discord !== undefined) {
        updateData.discord = updates.discord
          ? JSON.stringify(updates.discord)
          : existingConfig.discord;
      }
      if (updates.slack !== undefined) {
        updateData.slack = updates.slack ? JSON.stringify(updates.slack) : existingConfig.slack;
      }
      if (updates.mattermost !== undefined) {
        updateData.mattermost = updates.mattermost
          ? JSON.stringify(updates.mattermost)
          : existingConfig.mattermost;
      }
      if (updates.openai !== undefined) {
        updateData.openai = updates.openai ? JSON.stringify(updates.openai) : existingConfig.openai;
      }
      if (updates.flowise !== undefined) {
        updateData.flowise = updates.flowise
          ? JSON.stringify(updates.flowise)
          : existingConfig.flowise;
      }
      if (updates.openwebui !== undefined) {
        updateData.openwebui = updates.openwebui
          ? JSON.stringify(updates.openwebui)
          : existingConfig.openwebui;
      }
      if (updates.openswarm !== undefined) {
        updateData.openswarm = updates.openswarm
          ? JSON.stringify(updates.openswarm)
          : existingConfig.openswarm;
      }

      await this.dbManager.updateBotConfiguration(id, updateData);

      // Create audit log
      await this.dbManager.createBotConfigurationAudit({
        botConfigurationId: id,
        action: 'UPDATE',
        oldValues: JSON.stringify(existingConfig),
        newValues: JSON.stringify(updates),
        performedBy: updatedBy,
        performedAt: new Date(),
      });

      // Get updated configuration
      const updatedConfig = await this.dbManager.getBotConfiguration(id);
      if (!updatedConfig) {
        throw new Error('Failed to retrieve updated bot configuration');
      }

      debug(`Bot configuration updated: ${id}`);
      return updatedConfig;
    } catch (error) {
      debug('Error updating bot configuration:', error);
      throw error;
    }
  }

  /**
   * Delete a bot configuration
   */
  async deleteBotConfig(id: number, deletedBy?: string): Promise<boolean> {
    try {
      this.ensureDatabaseEnabled('delete bot configurations');

      // Get existing configuration for audit log
      const existingConfig = await this.dbManager.getBotConfiguration(id);
      if (!existingConfig) {
        throw new Error(`Bot configuration with ID ${id} not found`);
      }

      // Create audit log before deletion
      await this.dbManager.createBotConfigurationAudit({
        botConfigurationId: id,
        action: 'DELETE',
        oldValues: JSON.stringify(existingConfig),
        performedBy: deletedBy,
        performedAt: new Date(),
      });

      // Delete configuration
      const deleted = await this.dbManager.deleteBotConfiguration(id);

      if (deleted) {
        debug(`Bot configuration deleted: ${id}`);
      }

      return deleted;
    } catch (error) {
      debug('Error deleting bot configuration:', error);
      throw error;
    }
  }

  /**
   * Activate a bot configuration
   */
  async activateBotConfig(id: number, activatedBy?: string): Promise<BotConfigResponse> {
    try {
      this.ensureDatabaseEnabled('activate bot configurations');

      await this.dbManager.updateBotConfiguration(id, {
        isActive: true,
        updatedAt: new Date(),
        updatedBy: activatedBy,
      });

      // Create audit log
      await this.dbManager.createBotConfigurationAudit({
        botConfigurationId: id,
        action: 'ACTIVATE',
        performedBy: activatedBy,
        performedAt: new Date(),
      });

      const config = await this.dbManager.getBotConfiguration(id);
      if (!config) {
        throw new Error('Failed to retrieve activated bot configuration');
      }

      debug(`Bot configuration activated: ${id}`);
      return config;
    } catch (error) {
      debug('Error activating bot configuration:', error);
      throw error;
    }
  }

  /**
   * Deactivate a bot configuration
   */
  async deactivateBotConfig(id: number, deactivatedBy?: string): Promise<BotConfigResponse> {
    try {
      this.ensureDatabaseEnabled('deactivate bot configurations');

      await this.dbManager.updateBotConfiguration(id, {
        isActive: false,
        updatedAt: new Date(),
        updatedBy: deactivatedBy,
      });

      // Create audit log
      await this.dbManager.createBotConfigurationAudit({
        botConfigurationId: id,
        action: 'DEACTIVATE',
        performedBy: deactivatedBy,
        performedAt: new Date(),
      });

      const config = await this.dbManager.getBotConfiguration(id);
      if (!config) {
        throw new Error('Failed to retrieve deactivated bot configuration');
      }

      debug(`Bot configuration deactivated: ${id}`);
      return config;
    } catch (error) {
      debug('Error deactivating bot configuration:', error);
      throw error;
    }
  }

  /**
   * Create a new version of a bot configuration
   */
  async createBotConfigVersion(
    botConfigurationId: number,
    changeLog?: string,
    createdBy?: string
  ): Promise<BotConfigurationVersion> {
    try {
      this.ensureDatabaseEnabled('version bot configurations');

      // Get current configuration
      const currentConfig = await this.dbManager.getBotConfiguration(botConfigurationId);
      if (!currentConfig) {
        throw new Error(`Bot configuration with ID ${botConfigurationId} not found`);
      }

      // Get next version number
      const versions = await this.dbManager.getBotConfigurationVersions(botConfigurationId);
      const nextVersion =
        versions.length > 0
          ? (Math.max(...versions.map((v) => parseInt(v.version))) + 1).toString()
          : '1';

      // Create version
      const version: BotConfigurationVersion = {
        botConfigurationId,
        version: nextVersion,
        name: currentConfig.name,
        messageProvider: currentConfig.messageProvider,
        llmProvider: currentConfig.llmProvider,
        persona: currentConfig.persona,
        systemInstruction: currentConfig.systemInstruction,
        mcpServers:
          typeof currentConfig.mcpServers === 'string'
            ? currentConfig.mcpServers
            : JSON.stringify(currentConfig.mcpServers || []),
        mcpGuard: currentConfig.mcpGuard,
        discord: currentConfig.discord,
        slack: currentConfig.slack,
        mattermost: currentConfig.mattermost,
        openai: currentConfig.openai,
        flowise: currentConfig.flowise,
        openwebui: currentConfig.openwebui,
        openswarm: currentConfig.openswarm,
        isActive: true,
        createdAt: new Date(),
        createdBy,
        changeLog,
      };

      const versionId = await this.dbManager.createBotConfigurationVersion(version);

      debug(`Bot configuration version created: ${botConfigurationId} v${nextVersion}`);
      return { ...version, id: versionId };
    } catch (error) {
      debug('Error creating bot configuration version:', error);
      throw error;
    }
  }

  /**
   * Get configuration statistics
   */
  async getConfigStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byProvider: Record<string, number>;
    byLlmProvider: Record<string, number>;
  }> {
    try {
      this.ensureDatabaseEnabled('retrieve bot configuration statistics');

      const configs = await this.dbManager.getAllBotConfigurations();

      const stats = {
        total: configs.length,
        active: configs.filter((c) => c.isActive).length,
        inactive: configs.filter((c) => !c.isActive).length,
        byProvider: {} as Record<string, number>,
        byLlmProvider: {} as Record<string, number>,
      };

      configs.forEach((config) => {
        // Count by message provider
        stats.byProvider[config.messageProvider] =
          (stats.byProvider[config.messageProvider] || 0) + 1;

        // Count by LLM provider
        stats.byLlmProvider[config.llmProvider] =
          (stats.byLlmProvider[config.llmProvider] || 0) + 1;
      });

      return stats;
    } catch (error) {
      debug('Error getting configuration stats:', error);
      throw error;
    }
  }

  /**
   * Validate a bot configuration
   */
  async validateBotConfig(configData: CreateBotConfigRequest | UpdateBotConfigRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    try {
      const validationResult = this.configValidator.validateBotConfig(configData as BotConfig);
      return validationResult;
    } catch (error) {
      debug('Error validating bot configuration:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: [],
        suggestions: [],
      };
    }
  }
}
