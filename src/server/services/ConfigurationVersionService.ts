import Debug from 'debug';
import {
  DatabaseManager,
  type BotConfiguration,
  type BotConfigurationAudit,
  type BotConfigurationVersion,
} from '../../database/DatabaseManager';
import { ConfigurationValidator } from './ConfigurationValidator';

const debug = Debug('app:ConfigurationVersionService');

export interface CreateVersionRequest {
  botConfigurationId: number;
  version: string;
  changeLog?: string;
  createdBy?: string;
}

export interface VersionHistoryResponse {
  versions: BotConfigurationVersion[];
  total: number;
  currentVersion?: string;
}

export interface VersionComparisonResult {
  version1: BotConfigurationVersion;
  version2: BotConfigurationVersion;
  differences: ConfigurationDifference[];
  summary: {
    added: number;
    modified: number;
    removed: number;
  };
}

export interface ConfigurationDifference {
  field: string;
  path: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'modified' | 'removed';
}

export class ConfigurationVersionService {
  private static instance: ConfigurationVersionService;
  private dbManager: DatabaseManager;
  private configValidator: ConfigurationValidator;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
    this.configValidator = new ConfigurationValidator();
  }

  public static getInstance(): ConfigurationVersionService {
    if (!ConfigurationVersionService.instance) {
      ConfigurationVersionService.instance = new ConfigurationVersionService();
    }
    return ConfigurationVersionService.instance;
  }

  /**
   * Create a new version of a bot configuration
   */
  async createVersion(request: CreateVersionRequest): Promise<BotConfigurationVersion> {
    try {
      // Get the current configuration
      const currentConfig = await this.dbManager.getBotConfiguration(request.botConfigurationId);
      if (!currentConfig) {
        throw new Error(`Bot configuration with ID ${request.botConfigurationId} not found`);
      }

      // Check if version already exists
      const existingVersions = await this.dbManager.getBotConfigurationVersions(
        request.botConfigurationId
      );
      const existingVersion = existingVersions.find((v) => v.version === request.version);
      if (existingVersion) {
        throw new Error(`Version ${request.version} already exists for this configuration`);
      }

      // Create version data
      const versionData: BotConfigurationVersion = {
        botConfigurationId: request.botConfigurationId,
        version: request.version,
        name: currentConfig.name,
        messageProvider: currentConfig.messageProvider,
        llmProvider: currentConfig.llmProvider,
        persona: currentConfig.persona,
        systemInstruction: currentConfig.systemInstruction,
        mcpServers: currentConfig.mcpServers,
        mcpGuard: currentConfig.mcpGuard,
        discord: currentConfig.discord,
        slack: currentConfig.slack,
        mattermost: currentConfig.mattermost,
        openai: currentConfig.openai,
        flowise: currentConfig.flowise,
        openwebui: currentConfig.openwebui,
        openswarm: currentConfig.openswarm,
        isActive: currentConfig.isActive,
        createdAt: new Date(),
        createdBy: request.createdBy || 'system',
        changeLog: request.changeLog || `Created version ${request.version}`,
      };

      // Save version to database
      const versionId = await this.dbManager.createBotConfigurationVersion(versionData);

      // Get the created version with ID - need to find it in the versions list
      const versions = await this.dbManager.getBotConfigurationVersions(request.botConfigurationId);
      const createdVersion = versions.find((v) => v.version === request.version);

      if (!createdVersion) {
        throw new Error('Failed to create configuration version');
      }

      debug(
        `Created configuration version: ${request.version} for bot configuration ID: ${request.botConfigurationId}`
      );
      return createdVersion;
    } catch (error) {
      debug('Error creating configuration version:', error);
      throw new Error(`Failed to create configuration version: ${error}`);
    }
  }

  /**
   * Get version history for a bot configuration
   */
  async getVersionHistory(botConfigurationId: number): Promise<VersionHistoryResponse> {
    try {
      const versions = await this.dbManager.getBotConfigurationVersions(botConfigurationId);
      const currentConfig = await this.dbManager.getBotConfiguration(botConfigurationId);

      return {
        versions: versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        total: versions.length,
        currentVersion: currentConfig?.name, // This could be enhanced to track current version
      };
    } catch (error) {
      debug('Error getting version history:', error);
      throw new Error(`Failed to get version history: ${error}`);
    }
  }

  /**
   * Get a specific version of a bot configuration
   */
  async getVersion(
    botConfigurationId: number,
    version: string
  ): Promise<BotConfigurationVersion | null> {
    try {
      const versions = await this.dbManager.getBotConfigurationVersions(botConfigurationId);
      return versions.find((v) => v.version === version) || null;
    } catch (error) {
      debug('Error getting configuration version:', error);
      throw new Error(`Failed to get configuration version: ${error}`);
    }
  }

  /**
   * Compare two versions of a bot configuration
   */
  async compareVersions(
    botConfigurationId: number,
    version1: string,
    version2: string
  ): Promise<VersionComparisonResult> {
    try {
      const versions = await this.dbManager.getBotConfigurationVersions(botConfigurationId);
      const v1 = versions.find((v) => v.version === version1);
      const v2 = versions.find((v) => v.version === version2);

      if (!v1 || !v2) {
        throw new Error('One or both versions not found');
      }

      const differences = this.compareConfigurations(v1, v2);
      const summary = this.generateDifferenceSummary(differences);

      return {
        version1: v1,
        version2: v2,
        differences,
        summary,
      };
    } catch (error) {
      debug('Error comparing configuration versions:', error);
      throw new Error(`Failed to compare configuration versions: ${error}`);
    }
  }

  /**
   * Restore a bot configuration to a specific version
   */
  async restoreVersion(
    botConfigurationId: number,
    version: string,
    restoredBy?: string
  ): Promise<BotConfiguration> {
    try {
      // Get the version to restore
      const versions = await this.dbManager.getBotConfigurationVersions(botConfigurationId);
      const versionData = versions.find((v) => v.version === version);
      if (!versionData) {
        throw new Error(`Version ${version} not found`);
      }

      // Create update data from version
      const updateData: Partial<BotConfiguration> = {
        name: versionData.name,
        messageProvider: versionData.messageProvider,
        llmProvider: versionData.llmProvider,
        persona: versionData.persona,
        systemInstruction: versionData.systemInstruction,
        mcpServers: versionData.mcpServers,
        mcpGuard: versionData.mcpGuard,
        discord: versionData.discord,
        slack: versionData.slack,
        mattermost: versionData.mattermost,
        openai: versionData.openai,
        flowise: versionData.flowise,
        openwebui: versionData.openwebui,
        openswarm: versionData.openswarm,
        isActive: versionData.isActive,
        updatedAt: new Date(),
      };

      // Update the configuration
      await this.dbManager.updateBotConfiguration(botConfigurationId, updateData);

      // Get the updated configuration
      const restoredConfig = await this.dbManager.getBotConfiguration(botConfigurationId);
      if (!restoredConfig) {
        throw new Error('Failed to restore configuration');
      }

      // Create audit log entry
      await this.dbManager.createBotConfigurationAudit({
        botConfigurationId,
        action: 'UPDATE',
        oldValues: JSON.stringify({ restoredFrom: version }),
        newValues: JSON.stringify(restoredConfig),
        performedAt: new Date(),
        performedBy: restoredBy,
      });

      debug(`Restored bot configuration ID: ${botConfigurationId} to version: ${version}`);
      return restoredConfig;
    } catch (error) {
      debug('Error restoring configuration version:', error);
      throw new Error(`Failed to restore configuration version: ${error}`);
    }
  }

  /**
   * Delete a version (if not the only version)
   */
  async deleteVersion(botConfigurationId: number, version: string): Promise<boolean> {
    try {
      // Check if this is the only version
      const versions = await this.dbManager.getBotConfigurationVersions(botConfigurationId);
      if (versions.length <= 1) {
        throw new Error('Cannot delete the only version of a configuration');
      }

      // Check if this is the currently active version
      const currentConfig = await this.dbManager.getBotConfiguration(botConfigurationId);
      if (currentConfig) {
        const versionToDelete = versions.find((v) => v.version === version);
        if (
          versionToDelete &&
          versionToDelete.messageProvider === currentConfig.messageProvider &&
          versionToDelete.llmProvider === currentConfig.llmProvider &&
          versionToDelete.persona === currentConfig.persona
        ) {
          throw new Error('Cannot delete the currently active version');
        }
      }

      const deleted = await this.dbManager.deleteBotConfigurationVersion(
        botConfigurationId,
        version
      );
      if (deleted) {
        debug(
          `Deleted configuration version: ${version} for bot configuration ID: ${botConfigurationId}`
        );
      }
      return deleted;
    } catch (error) {
      debug('Error deleting configuration version:', error);
      throw new Error(`Failed to delete configuration version: ${error}`);
    }
  }

  /**
   * Get audit log for a bot configuration
   */
  async getAuditLog(
    botConfigurationId: number,
    limit: number = 50
  ): Promise<BotConfigurationAudit[]> {
    try {
      const audits = await this.dbManager.getBotConfigurationAudit(botConfigurationId);
      return audits.slice(0, limit);
    } catch (error) {
      debug('Error getting audit log:', error);
      throw new Error(`Failed to get audit log: ${error}`);
    }
  }

  /**
   * Compare two configuration objects and find differences
   */
  private compareConfigurations(
    config1: BotConfigurationVersion,
    config2: BotConfigurationVersion
  ): ConfigurationDifference[] {
    const differences: ConfigurationDifference[] = [];

    // Helper function to compare objects recursively
    const compareObjects = (obj1: any, obj2: any, path: string = '') => {
      const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;

        if (!(key in obj1)) {
          differences.push({
            field: key,
            path: currentPath,
            oldValue: undefined,
            newValue: obj2[key],
            changeType: 'added',
          });
        } else if (!(key in obj2)) {
          differences.push({
            field: key,
            path: currentPath,
            oldValue: obj1[key],
            newValue: undefined,
            changeType: 'removed',
          });
        } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          compareObjects(obj1[key], obj2[key], currentPath);
        } else if (obj1[key] !== obj2[key]) {
          differences.push({
            field: key,
            path: currentPath,
            oldValue: obj1[key],
            newValue: obj2[key],
            changeType: 'modified',
          });
        }
      }
    };

    // Compare all configuration fields
    const config1Plain = { ...config1 };
    const config2Plain = { ...config2 };

    // Remove fields that shouldn't be compared
    const { id, botConfigurationId, version, createdAt, createdBy, changeLog, ...config1Clean } =
      config1Plain;
    const {
      id: id2,
      botConfigurationId: botConfigurationId2,
      version: version2,
      createdAt: createdAt2,
      createdBy: createdBy2,
      changeLog: changeLog2,
      ...config2Clean
    } = config2Plain;

    compareObjects(config1Plain, config2Plain);

    return differences;
  }

  /**
   * Generate a summary of differences
   */
  private generateDifferenceSummary(differences: ConfigurationDifference[]) {
    return differences.reduce(
      (summary, diff) => {
        summary[diff.changeType]++;
        return summary;
      },
      { added: 0, modified: 0, removed: 0 }
    );
  }
}
