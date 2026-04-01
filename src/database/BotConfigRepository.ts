import Debug from 'debug';
import type { Database } from 'sqlite';
import type { BotConfiguration, BotConfigurationAudit, BotConfigurationVersion } from './types';

const debug = Debug('app:BotConfigRepository');

/**
 * Repository responsible for bot-configuration, version, and audit CRUD operations.
 */
export class BotConfigRepository {
  constructor(
    private getDb: () => Database | null,
    private ensureConnected: () => void
  ) {}

  // ---------------------------------------------------------------------------
  // Bot Configuration CRUD
  // ---------------------------------------------------------------------------

  async createBotConfiguration(config: BotConfiguration): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.run(
        `
        INSERT INTO bot_configurations (
          name, messageProvider, llmProvider, persona, systemInstruction,
          mcpServers, mcpGuard, discord, slack, mattermost,
          openai, flowise, openwebui, openswarm,
          isActive, createdAt, updatedAt, createdBy, updatedBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          config.name,
          config.messageProvider,
          config.llmProvider,
          config.persona,
          config.systemInstruction,
          config.mcpServers,
          config.mcpGuard,
          config.discord,
          config.slack,
          config.mattermost,
          config.openai,
          config.flowise,
          config.openwebui,
          config.openswarm,
          config.isActive ? 1 : 0,
          config.createdAt.toISOString(),
          config.updatedAt.toISOString(),
          config.createdBy,
          config.updatedBy,
        ]
      );

      debug(`Bot configuration created with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error creating bot configuration:', error);
      throw new Error(`Failed to create bot configuration: ${error}`);
    }
  }

  private mapRowToBotConfiguration(row: Record<string, any>): BotConfiguration {
    // Hydrate JSON strings into objects if necessary (SQLite strings vs Postgres JSON)
    const parseIfString = (val: unknown) => (typeof val === 'string' ? JSON.parse(val) : val);

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
    };
  }

  async getBotConfiguration(id: number): Promise<BotConfiguration | null> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const row = await db.get('SELECT * FROM bot_configurations WHERE id = ?', [id]);

      if (!row) return null;

      return this.mapRowToBotConfiguration(row);
    } catch (error) {
      debug('Error getting bot configuration:', error);
      throw new Error(`Failed to get bot configuration: ${error}`);
    }
  }

  /**
   * Get multiple bot configurations by their IDs in a single query
   */
  async getBotConfigurationsBulk(ids: number[]): Promise<BotConfiguration[]> {
    this.ensureConnected();

    if (ids.length === 0) {
      return [];
    }

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const placeholders = ids.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT * FROM bot_configurations WHERE id IN (${placeholders})`,
        ids
      );

      return rows.map((row) => this.mapRowToBotConfiguration(row));
    } catch (error) {
      debug('Error getting bot configurations in bulk:', error);
      throw new Error(`Failed to get bot configurations in bulk: ${error}`);
    }
  }

  async getBotConfigurationByName(name: string): Promise<BotConfiguration | null> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const row = await db.get('SELECT * FROM bot_configurations WHERE name = ?', [name]);

      if (!row) return null;

      return this.mapRowToBotConfiguration(row);
    } catch (error) {
      debug('Error getting bot configuration by name:', error);
      throw new Error(`Failed to get bot configuration by name: ${error}`);
    }
  }

  async getAllBotConfigurations(): Promise<BotConfiguration[]> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const rows = await db.all('SELECT * FROM bot_configurations ORDER BY updatedAt DESC');

      return rows.map((row) => this.mapRowToBotConfiguration(row));
    } catch (error) {
      debug('Error getting all bot configurations:', error);
      throw new Error(`Failed to get all bot configurations: ${error}`);
    }
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
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const configs = await db.all('SELECT * FROM bot_configurations ORDER BY updatedAt DESC');

      if (configs.length === 0) {
        return [];
      }

      const configIds = configs.map((config) => config.id);

      // Get all versions and audit logs in bulk
      const [versionsMap, auditMap] = await Promise.all([
        this.getBotConfigurationVersionsBulk(configIds),
        this.getBotConfigurationAuditBulk(configIds),
      ]);

      return configs.map((row) => {
        const mappedConfig = this.mapRowToBotConfiguration(row);
        return {
          ...mappedConfig,
          versions: versionsMap.get(row.id) || [],
          auditLog: auditMap.get(row.id) || [],
        };
      });
    } catch (error) {
      debug('Error getting all bot configurations with details:', error);
      throw new Error(`Failed to get all bot configurations with details: ${error}`);
    }
  }

  async updateBotConfiguration(id: number, config: Partial<BotConfiguration>): Promise<void> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

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
        values.push(config.mcpServers);
      }
      if (config.mcpGuard !== undefined) {
        updateFields.push('mcpGuard = ?');
        values.push(config.mcpGuard);
      }
      if (config.discord !== undefined) {
        updateFields.push('discord = ?');
        values.push(config.discord);
      }
      if (config.slack !== undefined) {
        updateFields.push('slack = ?');
        values.push(config.slack);
      }
      if (config.mattermost !== undefined) {
        updateFields.push('mattermost = ?');
        values.push(config.mattermost);
      }
      if (config.openai !== undefined) {
        updateFields.push('openai = ?');
        values.push(config.openai);
      }
      if (config.flowise !== undefined) {
        updateFields.push('flowise = ?');
        values.push(config.flowise);
      }
      if (config.openwebui !== undefined) {
        updateFields.push('openwebui = ?');
        values.push(config.openwebui);
      }
      if (config.openswarm !== undefined) {
        updateFields.push('openswarm = ?');
        values.push(config.openswarm);
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

      // SECURITY: SQL injection safe - updateFields contains only validated column names
      // constructed from object keys, not user input. Each value is parameterized via
      // the `values` array. The column names are from the config object structure which
      // is validated by TypeScript types.
      await db.run(`UPDATE bot_configurations SET ${updateFields.join(', ')} WHERE id = ?`, values);

      debug(`Bot configuration updated: ${id}`);
    } catch (error) {
      debug('Error updating bot configuration:', error);
      throw new Error(`Failed to update bot configuration: ${error}`);
    }
  }

  async deleteBotConfiguration(id: number): Promise<boolean> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.run('DELETE FROM bot_configurations WHERE id = ?', [id]);
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

  // ---------------------------------------------------------------------------
  // Bot Configuration Versions
  // ---------------------------------------------------------------------------

  async createBotConfigurationVersion(version: BotConfigurationVersion): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.run(
        `
        INSERT INTO bot_configuration_versions (
          botConfigurationId, version, name, messageProvider, llmProvider,
          persona, systemInstruction, mcpServers, mcpGuard, discord,
          slack, mattermost, openai, flowise,
          openwebui, openswarm, isActive, createdAt, createdBy, changeLog
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          version.botConfigurationId,
          version.version,
          version.name,
          version.messageProvider,
          version.llmProvider,
          version.persona,
          version.systemInstruction,
          version.mcpServers,
          version.mcpGuard,
          version.discord,
          version.slack,
          version.mattermost,
          version.openai,
          version.flowise,
          version.openwebui,
          version.openswarm,
          version.isActive ? 1 : 0,
          version.createdAt.toISOString(),
          version.createdBy,
          version.changeLog,
        ]
      );

      debug(`Bot configuration version created with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error creating bot configuration version:', error);
      throw new Error(`Failed to create bot configuration version: ${error}`);
    }
  }

  private mapRowToBotConfigurationVersion(row: Record<string, any>): BotConfigurationVersion {
    const parseIfString = (val: unknown) => (typeof val === 'string' ? JSON.parse(val) : val);
    return {
      id: row.id,
      botConfigurationId: row.botConfigurationId,
      version: row.version,
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
      createdBy: row.createdBy,
      changeLog: row.changeLog,
    };
  }

  async getBotConfigurationVersions(
    botConfigurationId: number
  ): Promise<BotConfigurationVersion[]> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const rows = await db.all(
        'SELECT * FROM bot_configuration_versions WHERE botConfigurationId = ? ORDER BY version DESC',
        [botConfigurationId]
      );

      return rows.map((row) => this.mapRowToBotConfigurationVersion(row));
    } catch (error) {
      debug('Error getting bot configuration versions:', error);
      throw new Error(`Failed to get bot configuration versions: ${error}`);
    }
  }

  /**
   * Get bot configuration versions for multiple configurations in a single query
   */
  async getBotConfigurationVersionsBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationVersion[]>> {
    this.ensureConnected();

    if (botConfigurationIds.length === 0) {
      return new Map();
    }

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const placeholders = botConfigurationIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT * FROM bot_configuration_versions WHERE botConfigurationId IN (${placeholders}) ORDER BY botConfigurationId, version DESC`,
        botConfigurationIds
      );

      const versionsMap = new Map<number, BotConfigurationVersion[]>();

      rows.forEach((row) => {
        const configId = row.botConfigurationId;
        const version = this.mapRowToBotConfigurationVersion(row);

        if (!versionsMap.has(configId)) {
          versionsMap.set(configId, []);
        }
        versionsMap.get(configId)?.push(version);
      });

      return versionsMap;
    } catch (error) {
      debug('Error getting bulk bot configuration versions:', error);
      throw new Error(`Failed to get bulk bot configuration versions: ${error}`);
    }
  }

  async deleteBotConfigurationVersion(
    botConfigurationId: number,
    version: string
  ): Promise<boolean> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      // Check if this is the only version
      const versions = await this.getBotConfigurationVersions(botConfigurationId);
      if (versions.length <= 1) {
        throw new Error('Cannot delete the only version of a configuration');
      }

      // Check if this is the currently active version
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

      const result = await db.run(
        'DELETE FROM bot_configuration_versions WHERE botConfigurationId = ? AND version = ?',
        [botConfigurationId, version]
      );

      const deleted = (result.changes ?? 0) > 0;

      if (deleted) {
        debug(
          `Deleted configuration version: ${version} for bot configuration ID: ${botConfigurationId}`
        );

        // Create audit log entry
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

  // ---------------------------------------------------------------------------
  // Bot Configuration Audit
  // ---------------------------------------------------------------------------

  async createBotConfigurationAudit(audit: BotConfigurationAudit): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.run(
        `
        INSERT INTO bot_configuration_audit (
          botConfigurationId, action, oldValues, newValues, performedBy,
          performedAt, ipAddress, userAgent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        ]
      );

      debug(`Bot configuration audit created with ID: ${result.lastID}`);
      return result.lastID as number;
    } catch (error) {
      debug('Error creating bot configuration audit:', error);
      throw new Error(`Failed to create bot configuration audit: ${error}`);
    }
  }

  private mapRowToBotConfigurationAudit(row: Record<string, any>): BotConfigurationAudit {
    return {
      id: row.id,
      botConfigurationId: row.botConfigurationId,
      action: row.action,
      oldValues: row.oldValues,
      newValues: row.newValues,
      performedBy: row.performedBy,
      performedAt: new Date(row.performedAt),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    };
  }

  async getBotConfigurationAudit(botConfigurationId: number): Promise<BotConfigurationAudit[]> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const rows = await db.all(
        'SELECT * FROM bot_configuration_audit WHERE botConfigurationId = ? ORDER BY performedAt DESC',
        [botConfigurationId]
      );

      return rows.map((row) => this.mapRowToBotConfigurationAudit(row));
    } catch (error) {
      debug('Error getting bot configuration audit:', error);
      throw new Error(`Failed to get bot configuration audit: ${error}`);
    }
  }

  /**
   * Get bot configuration audit logs for multiple configurations in a single query
   */
  async getBotConfigurationAuditBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationAudit[]>> {
    this.ensureConnected();

    if (botConfigurationIds.length === 0) {
      return new Map();
    }

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const placeholders = botConfigurationIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT * FROM bot_configuration_audit WHERE botConfigurationId IN (${placeholders}) ORDER BY botConfigurationId, performedAt DESC`,
        botConfigurationIds
      );

      const auditMap = new Map<number, BotConfigurationAudit[]>();

      rows.forEach((row) => {
        const configId = row.botConfigurationId;
        const audit = this.mapRowToBotConfigurationAudit(row);

        if (!auditMap.has(configId)) {
          auditMap.set(configId, []);
        }
        auditMap.get(configId)?.push(audit);
      });

      return auditMap;
    } catch (error) {
      debug('Error getting bulk bot configuration audit:', error);
      throw new Error(`Failed to get bulk bot configuration audit: ${error}`);
    }
  }
}
