/* eslint-disable max-lines */
import Debug from 'debug';
import type {
  BotConfiguration,
  BotConfigurationAudit,
  BotConfigurationVersion,
  IDatabase as Database,
} from '../types';
import {
  BotConfigAuditRepository,
  BotConfigRepositoryBase,
  BotConfigVersionRepository,
} from './BotConfigSupportRepository';

const debug = Debug('app:BotConfigRepository');

/**
 * Repository responsible for bot-configuration CRUD operations.
 * Delegating version and audit logic to specialized support repositories.
 */
export class BotConfigRepository extends BotConfigRepositoryBase {
  private versionRepo: BotConfigVersionRepository;
  private auditRepo: BotConfigAuditRepository;

  constructor(getDb: () => Database | null, ensureConnected: () => void) {
    super(getDb, ensureConnected);
    this.versionRepo = new BotConfigVersionRepository(getDb, ensureConnected);
    this.auditRepo = new BotConfigAuditRepository(getDb, ensureConnected);
  }

  // ---------------------------------------------------------------------------
  // Bot Configuration CRUD
  // ---------------------------------------------------------------------------

  async createBotConfiguration(config: BotConfiguration): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not available');
      }

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
    return {
      id: row.id as number,
      name: row.name as string,
      messageProvider: row.messageProvider as string,
      llmProvider: row.llmProvider as string,
      persona: row.persona as string | undefined,
      systemInstruction: row.systemInstruction as string | undefined,
      mcpServers: row.mcpServers ? (this.parseIfString(row.mcpServers) as any) : undefined,
      mcpGuard: row.mcpGuard ? (this.parseIfString(row.mcpGuard) as any) : undefined,
      discord: this.decryptField(row.discord) as any,
      slack: this.decryptField(row.slack) as any,
      mattermost: this.decryptField(row.mattermost) as any,
      openai: this.decryptField(row.openai) as any,
      flowise: this.decryptField(row.flowise) as any,
      openwebui: this.decryptField(row.openwebui) as any,
      openswarm: this.decryptField(row.openswarm) as any,
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
      if (!db) {
        throw new Error('Database not available');
      }

      const row = await db.get('SELECT * FROM bot_configurations WHERE id = ?', [id]);

      if (!row) {
        return null;
      }

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
      if (!db) {
        throw new Error('Database not available');
      }

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
      if (!db) {
        throw new Error('Database not available');
      }

      const row = await db.get('SELECT * FROM bot_configurations WHERE name = ?', [name]);

      if (!row) {
        return null;
      }

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
      if (!db) {
        throw new Error('Database not available');
      }

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
      if (!db) {
        throw new Error('Database not available');
      }

      const configs = await db.all('SELECT * FROM bot_configurations ORDER BY updatedAt DESC');

      if (configs.length === 0) {
        return [];
      }

      const configIds = configs.map((config) => config.id);

      const [versionsMap, auditMap] = await Promise.all([
        this.versionRepo.getBotConfigurationVersionsBulk(configIds),
        this.auditRepo.getBotConfigurationAuditBulk(configIds),
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

  private static readonly UPDATABLE_COLUMNS = new Set<string>([
    'name',
    'messageProvider',
    'llmProvider',
    'persona',
    'systemInstruction',
    'mcpServers',
    'mcpGuard',
    'discord',
    'slack',
    'mattermost',
    'openai',
    'flowise',
    'openwebui',
    'openswarm',
    'isActive',
    'updatedAt',
  ]);

  async updateBotConfiguration(id: number, config: Partial<BotConfiguration>): Promise<void> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const updateFields: string[] = [];
      const values: unknown[] = [];

      Object.entries(config).forEach(([key, value]) => {
        if (key === 'id' || value === undefined) {
          return;
        }
        if (!BotConfigRepository.UPDATABLE_COLUMNS.has(key)) {
          debug(`updateBotConfiguration: dropping non-allowlisted column "${key}"`);
          return;
        }

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

      if (updateFields.length === 0) {
        return;
      }

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
      if (!db) {
        throw new Error('Database not available');
      }

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
  // Versioning & Audit (Delegated)
  // ---------------------------------------------------------------------------

  async createBotConfigurationVersion(version: BotConfigurationVersion): Promise<number> {
    return this.versionRepo.createBotConfigurationVersion(version);
  }

  async getBotConfigurationVersions(
    botConfigurationId: number
  ): Promise<BotConfigurationVersion[]> {
    return this.versionRepo.getBotConfigurationVersions(botConfigurationId);
  }

  async getBotConfigurationVersionsBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationVersion[]>> {
    return this.versionRepo.getBotConfigurationVersionsBulk(botConfigurationIds);
  }

  async deleteBotConfigurationVersion(
    botConfigurationId: number,
    version: string
  ): Promise<boolean> {
    return this.versionRepo.deleteBotConfigurationVersion(botConfigurationId, version);
  }

  async createBotConfigurationAudit(audit: BotConfigurationAudit): Promise<number> {
    return this.auditRepo.createBotConfigurationAudit(audit);
  }
        val ? encryptionService.encrypt(String(val)) : null;

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
    const decryptVal = (val: unknown): string | null => {
      if (!val) {
        return null;
      }
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
      oldValues: decryptVal(row.oldValues) as string | undefined,
      newValues: decryptVal(row.newValues) as string | undefined,
      performedBy: row.performedBy as string | undefined,
      performedAt: new Date(row.performedAt as string | number | Date),
      ipAddress: row.ipAddress as string | undefined,
      userAgent: row.userAgent as string | undefined,
    };
>>>>>>> 14b838258 (security: lock down exposed resource routes and add Discord test endpoint)
  }

  async getBotConfigurationAudit(botConfigurationId: number): Promise<BotConfigurationAudit[]> {
    return this.auditRepo.getBotConfigurationAudit(botConfigurationId);
  }

  async getBotConfigurationAuditBulk(
    botConfigurationIds: number[]
  ): Promise<Map<number, BotConfigurationAudit[]>> {
    return this.auditRepo.getBotConfigurationAuditBulk(botConfigurationIds);
  }
}
