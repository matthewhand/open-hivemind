import { Database } from 'sqlite';
import Debug from 'debug';
import {
  BotConfiguration,
  BotConfigurationVersion,
  BotConfigurationAudit
} from '../DatabaseManager';

const debug = Debug('app:ConfigRepository');

export class ConfigRepository {
  private db: Database | null;
  private isConnected: () => boolean;

  constructor(db: Database | null, isConnected: () => boolean) {
    this.db = db;
    this.isConnected = isConnected;
  }

  setDb(db: Database | null) {
    this.db = db;
  }

  private ensureConnected(): void {
    if (!this.db || !this.isConnected()) {
      throw new Error('Database not connected');
    }
  }

  async createBotConfiguration(config: BotConfiguration): Promise<number> {
    this.ensureConnected();

    try {
      const result = await this.db!.run(
        `
        INSERT INTO bot_configurations (
          name, messageProvider, llmProvider, persona, systemInstruction,
          mcpServers, mcpGuard, discord, slack, mattermost,
          openai, flowise, openwebui, openswarm,
          isActive, createdAt, updatedAt, createdBy, updatedBy, tenantId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          config.name,
          config.messageProvider,
          config.llmProvider,
          config.persona,
          config.systemInstruction,
          config.mcpServers ? JSON.stringify(config.mcpServers) : null,
          config.mcpGuard ? JSON.stringify(config.mcpGuard) : null,
          config.discord ? JSON.stringify(config.discord) : null,
          config.slack ? JSON.stringify(config.slack) : null,
          config.mattermost ? JSON.stringify(config.mattermost) : null,
          config.openai ? JSON.stringify(config.openai) : null,
          config.flowise ? JSON.stringify(config.flowise) : null,
          config.openwebui ? JSON.stringify(config.openwebui) : null,
          config.openswarm ? JSON.stringify(config.openswarm) : null,
          config.isActive ? 1 : 0,
          config.createdAt.toISOString(),
          config.updatedAt.toISOString(),
          config.createdBy,
          config.updatedBy,
          config.tenantId,
        ]
      );

      debug(`Bot configuration created with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error creating bot configuration:', error);
      throw new Error(`Failed to create bot configuration: ${error}`);
    }
  }

  async getBotConfiguration(id: number): Promise<BotConfiguration | null> {
    this.ensureConnected();

    try {
      const row = await this.db!.get('SELECT * FROM bot_configurations WHERE id = ?', [id]);

      if (!row) return null;

      const parseIfString = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val);

      return {
        id: row.id,
        name: row.name,
        messageProvider: row.messageProvider,
        llmProvider: row.llmProvider,
        persona: row.persona,
        systemInstruction: row.systemInstruction,
        mcpServers: row.mcpServers ? parseIfString(row.mcpServers) : null,
        mcpGuard: row.mcpGuard ? parseIfString(row.mcpGuard) : null,
        discord: row.discord ? parseIfString(row.discord) : null,
        slack: row.slack ? parseIfString(row.slack) : null,
        mattermost: row.mattermost ? parseIfString(row.mattermost) : null,
        openai: row.openai ? parseIfString(row.openai) : null,
        flowise: row.flowise ? parseIfString(row.flowise) : null,
        openwebui: row.openwebui ? parseIfString(row.openwebui) : null,
        openswarm: row.openswarm ? parseIfString(row.openswarm) : null,
        isActive: row.isActive === 1,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        tenantId: row.tenantId,
      };
    } catch (error) {
      debug('Error getting bot configuration:', error);
      throw new Error(`Failed to get bot configuration: ${error}`);
    }
  }

  async getBotConfigurationsBulk(ids: number[]): Promise<BotConfiguration[]> {
    this.ensureConnected();

    if (ids.length === 0) {
      return [];
    }

    try {
      const placeholders = ids.map(() => '?').join(',');
      const rows = await this.db!.all(
        `SELECT * FROM bot_configurations WHERE id IN (${placeholders})`,
        ids
      );

      return rows.map((row) => {
        const parseIfString = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val);

        return {
          id: row.id,
          name: row.name,
          messageProvider: row.messageProvider,
          llmProvider: row.llmProvider,
          persona: row.persona,
          systemInstruction: row.systemInstruction,
          mcpServers: row.mcpServers ? parseIfString(row.mcpServers) : null,
          mcpGuard: row.mcpGuard ? parseIfString(row.mcpGuard) : null,
          discord: row.discord ? parseIfString(row.discord) : null,
          slack: row.slack ? parseIfString(row.slack) : null,
          mattermost: row.mattermost ? parseIfString(row.mattermost) : null,
          openai: row.openai ? parseIfString(row.openai) : null,
          flowise: row.flowise ? parseIfString(row.flowise) : null,
          openwebui: row.openwebui ? parseIfString(row.openwebui) : null,
          openswarm: row.openswarm ? parseIfString(row.openswarm) : null,
          isActive: row.isActive === 1,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          createdBy: row.createdBy,
          updatedBy: row.updatedBy,
          tenantId: row.tenantId,
        };
      });
    } catch (error) {
      debug('Error getting bot configurations in bulk:', error);
      throw new Error(`Failed to get bot configurations in bulk: ${error}`);
    }
  }

  async getBotConfigurationByName(name: string): Promise<BotConfiguration | null> {
    this.ensureConnected();

    try {
      const row = await this.db!.get('SELECT * FROM bot_configurations WHERE name = ?', [name]);

      if (!row) return null;

      const parseIfString = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val);

      return {
        id: row.id,
        name: row.name,
        messageProvider: row.messageProvider,
        llmProvider: row.llmProvider,
        persona: row.persona,
        systemInstruction: row.systemInstruction,
        mcpServers: row.mcpServers ? parseIfString(row.mcpServers) : null,
        mcpGuard: row.mcpGuard ? parseIfString(row.mcpGuard) : null,
        discord: row.discord ? parseIfString(row.discord) : null,
        slack: row.slack ? parseIfString(row.slack) : null,
        mattermost: row.mattermost ? parseIfString(row.mattermost) : null,
        openai: row.openai ? parseIfString(row.openai) : null,
        flowise: row.flowise ? parseIfString(row.flowise) : null,
        openwebui: row.openwebui ? parseIfString(row.openwebui) : null,
        openswarm: row.openswarm ? parseIfString(row.openswarm) : null,
        isActive: row.isActive === 1,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        tenantId: row.tenantId,
      };
    } catch (error) {
      debug('Error getting bot configuration by name:', error);
      throw new Error(`Failed to get bot configuration by name: ${error}`);
    }
  }

  async getAllBotConfigurations(): Promise<BotConfiguration[]> {
    this.ensureConnected();

    try {
      const rows = await this.db!.all('SELECT * FROM bot_configurations ORDER BY updatedAt DESC');

      return rows.map((row) => {
        const parseIfString = (val: any) => (typeof val === 'string' ? JSON.parse(val) : val);
        return {
          id: row.id,
          name: row.name,
          messageProvider: row.messageProvider,
          llmProvider: row.llmProvider,
          persona: row.persona,
          systemInstruction: row.systemInstruction,
          mcpServers: row.mcpServers ? parseIfString(row.mcpServers) : null,
          mcpGuard: row.mcpGuard ? parseIfString(row.mcpGuard) : null,
          discord: row.discord ? parseIfString(row.discord) : null,
          slack: row.slack ? parseIfString(row.slack) : null,
          mattermost: row.mattermost ? parseIfString(row.mattermost) : null,
          openai: row.openai ? parseIfString(row.openai) : null,
          flowise: row.flowise ? parseIfString(row.flowise) : null,
          openwebui: row.openwebui ? parseIfString(row.openwebui) : null,
          openswarm: row.openswarm ? parseIfString(row.openswarm) : null,
          isActive: row.isActive === 1,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
          createdBy: row.createdBy,
          updatedBy: row.updatedBy,
          tenantId: row.tenantId,
        };
      });
    } catch (error) {
      debug('Error getting all bot configurations:', error);
      throw new Error(`Failed to get all bot configurations: ${error}`);
    }
  }

  async getAllBotConfigurationsWithDetails(): Promise<
    (BotConfiguration & {
      versions: BotConfigurationVersion[];
      auditLog: BotConfigurationAudit[];
    })[]
  > {
    this.ensureConnected();

    try {
      const configs = await this.db!.all(
        'SELECT * FROM bot_configurations ORDER BY updatedAt DESC'
      );

      if (configs.length === 0) {
        return [];
      }

      const configIds = configs.map((config) => config.id);

      const [versionsMap, auditMap] = await Promise.all([
        this.getBotConfigurationVersionsBulk(configIds),
        this.getBotConfigurationAuditBulk(configIds),
      ]);

      return configs.map((row) => ({
        id: row.id,
        name: row.name,
        messageProvider: row.messageProvider,
        llmProvider: row.llmProvider,
        persona: row.persona,
        systemInstruction: row.systemInstruction,
        mcpServers: row.mcpServers,
        mcpGuard: row.mcpGuard,
        discord: row.discord,
        slack: row.slack,
        mattermost: row.mattermost,
        openai: row.openai,
        flowise: row.flowise,
        openwebui: row.openwebui,
        openswarm: row.openswarm,
        isActive: row.isActive === 1,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        createdBy: row.createdBy,
        updatedBy: row.updatedBy,
        versions: versionsMap.get(row.id) || [],
        auditLog: auditMap.get(row.id) || [],
      }));
    } catch (error) {
      debug('Error getting all bot configurations with details:', error);
      throw new Error(`Failed to get all bot configurations with details: ${error}`);
    }
  }

  async updateBotConfiguration(id: number, config: Partial<BotConfiguration>): Promise<void> {
    this.ensureConnected();

    try {
      const updateFields = [];
      const values = [];

      if (config.name !== undefined) {
        updateFields.push('name = ?');
        values.push(config.name);
      }
      if (config.messageProvider !== undefined) {
        updateFields.push('messageProvider = ?');
        values.push(config.messageProvider);
      }
      if (config.llmProvider !== undefined) {
        updateFields.push('llmProvider = ?');
        values.push(config.llmProvider);
      }
      if (config.persona !== undefined) {
        updateFields.push('persona = ?');
        values.push(config.persona);
      }
      if (config.systemInstruction !== undefined) {
        updateFields.push('systemInstruction = ?');
        values.push(config.systemInstruction);
      }
      if (config.mcpServers !== undefined) {
        updateFields.push('mcpServers = ?');
        values.push(typeof config.mcpServers === 'string' ? config.mcpServers : JSON.stringify(config.mcpServers));
      }
      if (config.mcpGuard !== undefined) {
        updateFields.push('mcpGuard = ?');
        values.push(typeof config.mcpGuard === 'string' ? config.mcpGuard : JSON.stringify(config.mcpGuard));
      }
      if (config.discord !== undefined) {
        updateFields.push('discord = ?');
        values.push(typeof config.discord === 'string' ? config.discord : JSON.stringify(config.discord));
      }
      if (config.slack !== undefined) {
        updateFields.push('slack = ?');
        values.push(typeof config.slack === 'string' ? config.slack : JSON.stringify(config.slack));
      }
      if (config.mattermost !== undefined) {
        updateFields.push('mattermost = ?');
        values.push(typeof config.mattermost === 'string' ? config.mattermost : JSON.stringify(config.mattermost));
      }
      if (config.openai !== undefined) {
        updateFields.push('openai = ?');
        values.push(typeof config.openai === 'string' ? config.openai : JSON.stringify(config.openai));
      }
      if (config.flowise !== undefined) {
        updateFields.push('flowise = ?');
        values.push(typeof config.flowise === 'string' ? config.flowise : JSON.stringify(config.flowise));
      }
      if (config.openwebui !== undefined) {
        updateFields.push('openwebui = ?');
        values.push(typeof config.openwebui === 'string' ? config.openwebui : JSON.stringify(config.openwebui));
      }
      if (config.openswarm !== undefined) {
        updateFields.push('openswarm = ?');
        values.push(typeof config.openswarm === 'string' ? config.openswarm : JSON.stringify(config.openswarm));
      }
      if (config.isActive !== undefined) {
        updateFields.push('isActive = ?');
        values.push(config.isActive ? 1 : 0);
      }
      if (config.updatedAt !== undefined) {
        updateFields.push('updatedAt = ?');
        values.push(config.updatedAt.toISOString());
      }
      if (config.updatedBy !== undefined) {
        updateFields.push('updatedBy = ?');
        values.push(config.updatedBy);
      }

      if (updateFields.length === 0) {
        return;
      }

      values.push(id);

      await this.db!.run(
        `UPDATE bot_configurations SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      debug(`Bot configuration updated: ${id}`);
    } catch (error) {
      debug('Error updating bot configuration:', error);
      throw new Error(`Failed to update bot configuration: ${error}`);
    }
  }

  async deleteBotConfiguration(id: number): Promise<boolean> {
    this.ensureConnected();

    try {
      const result = await this.db!.run('DELETE FROM bot_configurations WHERE id = ?', [id]);
      const deleted = (result.changes ?? 0) > 0;

      if (deleted) {
        debug(`Bot configuration deleted: ${id}`);
      }

      return deleted;
    } catch (error) {
      debug('Error deleting bot configuration:', error);
      throw new Error(`Failed to delete bot configuration: ${error}`);
    }
  }

  async createBotConfigurationVersion(version: BotConfigurationVersion): Promise<number> {
    this.ensureConnected();

    try {
      const result = await this.db!.run(
        `
        INSERT INTO bot_configuration_versions (
          botConfigurationId, version, name, messageProvider, llmProvider,
          persona, systemInstruction, mcpServers, mcpGuard, discord,
          slack, mattermost, openai, flowise,
          openwebui, openswarm, isActive, createdAt, createdBy, changeLog, tenantId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          version.botConfigurationId,
          version.version,
          version.name,
          version.messageProvider,
          version.llmProvider,
          version.persona,
          version.systemInstruction,
          typeof version.mcpServers === 'string' ? version.mcpServers : JSON.stringify(version.mcpServers),
          typeof version.mcpGuard === 'string' ? version.mcpGuard : JSON.stringify(version.mcpGuard),
          typeof version.discord === 'string' ? version.discord : JSON.stringify(version.discord),
          typeof version.slack === 'string' ? version.slack : JSON.stringify(version.slack),
          typeof version.mattermost === 'string' ? version.mattermost : JSON.stringify(version.mattermost),
          typeof version.openai === 'string' ? version.openai : JSON.stringify(version.openai),
          typeof version.flowise === 'string' ? version.flowise : JSON.stringify(version.flowise),
          typeof version.openwebui === 'string' ? version.openwebui : JSON.stringify(version.openwebui),
          typeof version.openswarm === 'string' ? version.openswarm : JSON.stringify(version.openswarm),
          version.isActive ? 1 : 0,
          version.createdAt.toISOString(),
          version.createdBy,
          version.changeLog,
          version.tenantId,
        ]
      );

      debug(`Bot configuration version created with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error creating bot configuration version:', error);
      throw new Error(`Failed to create bot configuration version: ${error}`);
    }
  }

  async getBotConfigurationVersions(
    botConfigurationId: number
  ): Promise<BotConfigurationVersion[]> {
    this.ensureConnected();

    try {
      const rows = await this.db!.all(
        'SELECT * FROM bot_configuration_versions WHERE botConfigurationId = ? ORDER BY version DESC',
        [botConfigurationId]
      );

      return rows.map((row) => ({
        id: row.id,
        botConfigurationId: row.botConfigurationId,
        version: row.version,
        name: row.name,
        messageProvider: row.messageProvider,
        llmProvider: row.llmProvider,
        persona: row.persona,
        systemInstruction: row.systemInstruction,
        mcpServers: row.mcpServers,
        mcpGuard: row.mcpGuard,
        discord: row.discord,
        slack: row.slack,
        mattermost: row.mattermost,
        openai: row.openai,
        flowise: row.flowise,
        openwebui: row.openwebui,
        openswarm: row.openswarm,
        isActive: row.isActive === 1,
        createdAt: new Date(row.createdAt),
        createdBy: row.createdBy,
        changeLog: row.changeLog,
        tenantId: row.tenantId,
      }));
    } catch (error) {
      debug('Error getting bot configuration versions:', error);
      throw new Error(`Failed to get bot configuration versions: ${error}`);
    }
  }

  async getBotConfigurationVersionsBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationVersion[]>> {
    this.ensureConnected();

    if (botConfigurationIds.length === 0) {
      return new Map();
    }

    try {
      const placeholders = botConfigurationIds.map(() => '?').join(',');
      const rows = await this.db!.all(
        `SELECT * FROM bot_configuration_versions WHERE botConfigurationId IN (${placeholders}) ORDER BY botConfigurationId, version DESC`,
        botConfigurationIds
      );

      const versionsMap = new Map<number, BotConfigurationVersion[]>();

      rows.forEach((row) => {
        const configId = row.botConfigurationId;
        const version: BotConfigurationVersion = {
          id: row.id,
          botConfigurationId: row.botConfigurationId,
          version: row.version,
          name: row.name,
          messageProvider: row.messageProvider,
          llmProvider: row.llmProvider,
          persona: row.persona,
          systemInstruction: row.systemInstruction,
          mcpServers: row.mcpServers,
          mcpGuard: row.mcpGuard,
          discord: row.discord,
          slack: row.slack,
          mattermost: row.mattermost,
          openai: row.openai,
          flowise: row.flowise,
          openwebui: row.openwebui,
          openswarm: row.openswarm,
          isActive: row.isActive === 1,
          createdAt: new Date(row.createdAt),
          createdBy: row.createdBy,
          changeLog: row.changeLog,
          tenantId: row.tenantId,
        };

        if (!versionsMap.has(configId)) {
          versionsMap.set(configId, []);
        }
        versionsMap.get(configId)!.push(version);
      });

      return versionsMap;
    } catch (error) {
      debug('Error getting bulk bot configuration versions:', error);
      throw new Error(`Failed to get bulk bot configuration versions: ${error}`);
    }
  }

  async createBotConfigurationAudit(audit: BotConfigurationAudit): Promise<number> {
    this.ensureConnected();

    try {
      const result = await this.db!.run(
        `
        INSERT INTO bot_configuration_audit (
          botConfigurationId, action, oldValues, newValues, performedBy,
          performedAt, ipAddress, userAgent, tenantId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          audit.botConfigurationId,
          audit.action,
          audit.oldValues,
          audit.newValues,
          audit.performedBy,
          audit.performedAt.toISOString(),
          audit.ipAddress,
          audit.userAgent,
          audit.tenantId,
        ]
      );

      debug(`Bot configuration audit created with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error creating bot configuration audit:', error);
      throw new Error(`Failed to create bot configuration audit: ${error}`);
    }
  }

  async getBotConfigurationAudit(botConfigurationId: number): Promise<BotConfigurationAudit[]> {
    this.ensureConnected();

    try {
      const rows = await this.db!.all(
        'SELECT * FROM bot_configuration_audit WHERE botConfigurationId = ? ORDER BY performedAt DESC',
        [botConfigurationId]
      );

      return rows.map((row) => ({
        id: row.id,
        botConfigurationId: row.botConfigurationId,
        action: row.action,
        oldValues: row.oldValues,
        newValues: row.newValues,
        performedBy: row.performedBy,
        performedAt: new Date(row.performedAt),
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        tenantId: row.tenantId,
      }));
    } catch (error) {
      debug('Error getting bot configuration audit:', error);
      throw new Error(`Failed to get bot configuration audit: ${error}`);
    }
  }

  async getBotConfigurationAuditBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationAudit[]>> {
    this.ensureConnected();

    if (botConfigurationIds.length === 0) {
      return new Map();
    }

    try {
      const placeholders = botConfigurationIds.map(() => '?').join(',');
      const rows = await this.db!.all(
        `SELECT * FROM bot_configuration_audit WHERE botConfigurationId IN (${placeholders}) ORDER BY botConfigurationId, performedAt DESC`,
        botConfigurationIds
      );

      const auditMap = new Map<number, BotConfigurationAudit[]>();

      rows.forEach((row) => {
        const configId = row.botConfigurationId;
        const audit: BotConfigurationAudit = {
          id: row.id,
          botConfigurationId: row.botConfigurationId,
          action: row.action,
          oldValues: row.oldValues,
          newValues: row.newValues,
          performedBy: row.performedBy,
          performedAt: new Date(row.performedAt),
          ipAddress: row.ipAddress,
          userAgent: row.userAgent,
          tenantId: row.tenantId,
        };

        if (!auditMap.has(configId)) {
          auditMap.set(configId, []);
        }
        auditMap.get(configId)!.push(audit);
      });

      return auditMap;
    } catch (error) {
      debug('Error getting bulk bot configuration audit:', error);
      throw new Error(`Failed to get bulk bot configuration audit: ${error}`);
    }
  }

  async deleteBotConfigurationVersion(
    botConfigurationId: number,
    version: string
  ): Promise<boolean> {
    this.ensureConnected();

    try {
      const versions = await this.getBotConfigurationVersions(botConfigurationId);
      if (versions.length <= 1) {
        throw new Error('Cannot delete the only version of a configuration');
      }

      const currentConfig = await this.getBotConfiguration(botConfigurationId);
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

      const result = await this.db!.run(
        'DELETE FROM bot_configuration_versions WHERE botConfigurationId = ? AND version = ?',
        [botConfigurationId, version]
      );

      const deleted = (result.changes ?? 0) > 0;

      if (deleted) {
        debug(
          `Deleted configuration version: ${version} for bot configuration ID: ${botConfigurationId}`
        );

        await this.createBotConfigurationAudit({
          botConfigurationId,
          action: 'DELETE',
          oldValues: JSON.stringify({ deletedVersion: version }),
          newValues: JSON.stringify({ status: 'deleted' }),
          performedAt: new Date(),
        });
      }

      return deleted;
    } catch (error) {
      debug('Error deleting bot configuration version:', error);
      throw new Error(`Failed to delete bot configuration version: ${error}`);
    }
  }
}
