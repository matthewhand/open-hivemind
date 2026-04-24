import Debug from 'debug';
import type { IDatabase as Database } from '../types';
import type { BotConfiguration, BotConfigurationAudit, BotConfigurationVersion } from '../types';
import { encryptionService } from '../EncryptionService';

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
  // Helpers
  // ---------------------------------------------------------------------------

  private readonly sensitiveFields = ['discord', 'slack', 'mattermost', 'openai', 'flowise', 'openwebui', 'openswarm'];

  private encryptField(val: any): any {
    if (val && typeof val === 'object') {
      return encryptionService.encrypt(JSON.stringify(val));
    }
    return val;
  }

  private decryptField(val: any): any {
    if (!val || typeof val !== 'string') return val;
    const decrypted = encryptionService.decrypt(val);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

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
          config.mcpServers ? JSON.stringify(config.mcpServers) : null,
          config.mcpGuard ? JSON.stringify(config.mcpGuard) : null,
          this.encryptField(config.discord),
          this.encryptField(config.slack),
          this.encryptField(config.mattermost),
          this.encryptField(config.openai),
          this.encryptField(config.flowise),
          this.encryptField(config.openwebui),
          this.encryptField(config.openswarm),
          config.isActive ? 1 : 0,
          (config.createdAt || new Date()).toISOString(),
          (config.updatedAt || new Date()).toISOString(),
          config.createdBy,
          config.updatedBy,
        ]
      );

      debug(`Bot configuration created with ID: ${result.lastID}`);
      return Number(result.lastID);
    } catch (error) {
      debug('Error creating bot configuration:', error);
      throw new Error(`Failed to create bot configuration: ${error}`);
    }
  }

  private mapRowToBotConfiguration(row: Record<string, unknown>): BotConfiguration {
    // Hydrate JSON strings into objects if necessary (SQLite strings vs Postgres JSON)
    const parseIfString = (val: unknown): any => (typeof val === 'string' ? JSON.parse(val) : val);

    return {
      id: row.id as number,
      name: row.name as string,
      messageProvider: row.messageProvider as string,
      llmProvider: row.llmProvider as string,
      persona: row.persona as string | undefined,
      systemInstruction: row.systemInstruction as string | undefined,
      mcpServers: row.mcpServers ? parseIfString(row.mcpServers) : undefined,
      mcpGuard: row.mcpGuard ? parseIfString(row.mcpGuard) : undefined,
      discord: this.decryptField(row.discord),
      slack: this.decryptField(row.slack),
      mattermost: this.decryptField(row.mattermost),
      openai: this.decryptField(row.openai),
      flowise: this.decryptField(row.flowise),
      openwebui: this.decryptField(row.openwebui),
      openswarm: this.decryptField(row.openswarm),
      isActive: Number(row.isActive) === 1,
      createdAt: new Date(row.createdAt as string | number | Date),
      updatedAt: new Date(row.updatedAt as string | number | Date),
      createdBy: row.createdBy as string | undefined,
      updatedBy: row.updatedBy as string | undefined,
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

      const updateFields: string[] = [];
      const values: any[] = [];

      Object.entries(config).forEach(([key, value]) => {
        if (key === 'id' || value === undefined) return;

        updateFields.push(`${key} = ?`);
        if (this.sensitiveFields.includes(key)) {
          values.push(this.encryptField(value));
        } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
          values.push(JSON.stringify(value));
        } else if (key === 'isActive') {
          values.push(value ? 1 : 0);
        } else if (value instanceof Date) {
          values.push(value.toISOString());
        } else {
          values.push(value);
        }
      });

      if (updateFields.length === 0) return;

      values.push(id);
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
          version.mcpServers ? JSON.stringify(version.mcpServers) : null,
          version.mcpGuard ? JSON.stringify(version.mcpGuard) : null,
          this.encryptField(version.discord),
          this.encryptField(version.slack),
          this.encryptField(version.mattermost),
          this.encryptField(version.openai),
          this.encryptField(version.flowise),
          this.encryptField(version.openwebui),
          this.encryptField(version.openswarm),
          version.isActive ? 1 : 0,
          (version.createdAt || new Date()).toISOString(),
          version.createdBy,
          version.changeLog,
        ]
      );

      debug(`Bot configuration version created with ID: ${result.lastID}`);
      return Number(result.lastID);
    } catch (error) {
      debug('Error creating bot configuration version:', error);
      throw new Error(`Failed to create bot configuration version: ${error}`);
    }
  }

  private mapRowToBotConfigurationVersion(row: Record<string, unknown>): BotConfigurationVersion {
    const parseIfString = (val: unknown): any => (typeof val === 'string' ? JSON.parse(val) : val);

    return {
      id: row.id as number,
      botConfigurationId: row.botConfigurationId as number,
      version: row.version as string,
      name: row.name as string,
      messageProvider: row.messageProvider as string,
      llmProvider: row.llmProvider as string,
      persona: row.persona as string | undefined,
      systemInstruction: row.systemInstruction as string | undefined,
      mcpServers: row.mcpServers ? parseIfString(row.mcpServers) : undefined,
      mcpGuard: row.mcpGuard ? parseIfString(row.mcpGuard) : undefined,
      discord: this.decryptField(row.discord),
      slack: this.decryptField(row.slack),
      mattermost: this.decryptField(row.mattermost),
      openai: this.decryptField(row.openai),
      flowise: this.decryptField(row.flowise),
      openwebui: this.decryptField(row.openwebui),
      openswarm: this.decryptField(row.openswarm),
      isActive: Number(row.isActive) === 1,
      createdAt: new Date(row.createdAt as string | number | Date),
      createdBy: row.createdBy as string | undefined,
      changeLog: row.changeLog as string | undefined,
    };
  }

  async getBotConfigurationVersions(botConfigurationId: number): Promise<BotConfigurationVersion[]> {
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

  async deleteBotConfigurationVersion(botConfigurationId: number, version: string): Promise<boolean> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) throw new Error('Database not available');

      const result = await db.run(
        'DELETE FROM bot_configuration_versions WHERE botConfigurationId = ? AND version = ?',
        [botConfigurationId, version]
      );

      return (result.changes ?? 0) > 0;
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

      // Audit logs contain full JSON snaps of config - encrypt them!
      const encryptVal = (val: any) => val ? encryptionService.encrypt(val) : val;

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
          encryptVal(audit.oldValues),
          encryptVal(audit.newValues),
          audit.performedBy,
          (audit.performedAt || new Date()).toISOString(),
          audit.ipAddress,
          audit.userAgent,
        ]
      );

      debug(`Bot configuration audit created with ID: ${result.lastID}`);
      return Number(result.lastID);
    } catch (error) {
      debug('Error creating bot configuration audit:', error);
      throw new Error(`Failed to create bot configuration audit: ${error}`);
    }
  }

  private mapRowToBotConfigurationAudit(row: Record<string, unknown>): BotConfigurationAudit {
    const decryptVal = (val: any) => {
      if (!val) return val;
      try {
        return encryptionService.decrypt(String(val));
      } catch (error) {
        debug('Failed to decrypt audit row field (id=%s): %O', row.id, error);
        return null;
      }
    };

    return {
      id: row.id as number | undefined,
      botConfigurationId: row.botConfigurationId as number,
      action: row.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE',
      oldValues: decryptVal(row.oldValues),
      newValues: decryptVal(row.newValues),
      performedBy: row.performedBy as string | undefined,
      performedAt: new Date(row.performedAt as string | number | Date),
      ipAddress: row.ipAddress as string | undefined,
      userAgent: row.userAgent as string | undefined,
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
