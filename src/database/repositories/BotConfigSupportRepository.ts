import Debug from 'debug';
import { encryptionService } from '../EncryptionService';
import type {
  BotConfigurationAudit,
  BotConfigurationVersion,
  IDatabase as Database,
} from '../types';

const debug = Debug('app:BotConfigRepository');

/**
 * Shared utility methods for BotConfig repositories.
 */
export class BotConfigRepositoryBase {
  constructor(
    protected getDb: () => Database | null,
    protected ensureConnected: () => void
  ) {}

  protected readonly sensitiveFields = [
    'discord',
    'slack',
    'mattermost',
    'openai',
    'flowise',
    'openwebui',
    'openswarm',
  ];

  protected encryptField(val: unknown): string | null {
    if (val && typeof val === 'object') {
      return encryptionService.encrypt(JSON.stringify(val));
    }
    return val ? String(val) : null;
  }

  protected decryptField(val: unknown): unknown {
    if (!val || typeof val !== 'string') {
      return val;
    }
    try {
      const decrypted = encryptionService.decrypt(val);
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      debug('Decryption failed:', error);
      return val;
    }
  }

  protected parseIfString(val: unknown): unknown {
    return typeof val === 'string' ? JSON.parse(val) : val;
  }
}

/**
 * Repository responsible for bot configuration version management.
 */
export class BotConfigVersionRepository extends BotConfigRepositoryBase {
  async createBotConfigurationVersion(version: BotConfigurationVersion): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not available');
      }

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

  mapRowToBotConfigurationVersion(row: Record<string, unknown>): BotConfigurationVersion {
    return {
      id: row.id as number,
      botConfigurationId: row.botConfigurationId as number,
      version: row.version as string,
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
      createdBy: row.createdBy as string | undefined,
      changeLog: row.changeLog as string | undefined,
    };
  }

  async getBotConfigurationVersions(
    botConfigurationId: number
  ): Promise<BotConfigurationVersion[]> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not available');
      }

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
      if (!db) {
        throw new Error('Database not available');
      }

      const placeholders = botConfigurationIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT * FROM bot_configuration_versions WHERE botConfigurationId IN (${placeholders}) ORDER BY botConfigurationId, version DESC`,
        botConfigurationIds
      );

      const versionsMap = new Map<number, BotConfigurationVersion[]>();

      rows.forEach((row) => {
        const configId = row.botConfigurationId as number;
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
      if (!db) {
        throw new Error('Database not available');
      }

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
}

/**
 * Repository responsible for bot configuration audit logging.
 */
export class BotConfigAuditRepository extends BotConfigRepositoryBase {
  async createBotConfigurationAudit(audit: BotConfigurationAudit): Promise<number> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const encryptVal = (val: unknown): string | null =>
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

  mapRowToBotConfigurationAudit(row: Record<string, unknown>): BotConfigurationAudit {
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
      oldValues: decryptVal(row.oldValues) ?? undefined,
      newValues: decryptVal(row.newValues) ?? undefined,
      performedBy: row.performedBy as string | undefined,
      performedAt: new Date(row.performedAt as string | number | Date),
      ipAddress: row.ipAddress !== null ? (row.ipAddress as string) : undefined,
      userAgent: row.userAgent !== null ? (row.userAgent as string) : undefined,
    };
  }

  async getBotConfigurationAudit(botConfigurationId: number): Promise<BotConfigurationAudit[]> {
    this.ensureConnected();

    try {
      const db = this.getDb();
      if (!db) {
        throw new Error('Database not available');
      }

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
      if (!db) {
        throw new Error('Database not available');
      }

      const placeholders = botConfigurationIds.map(() => '?').join(',');
      const rows = await db.all(
        `SELECT * FROM bot_configuration_audit WHERE botConfigurationId IN (${placeholders}) ORDER BY botConfigurationId, performedAt DESC`,
        botConfigurationIds
      );

      const auditMap = new Map<number, BotConfigurationAudit[]>();

      rows.forEach((row) => {
        const configId = row.botConfigurationId as number;
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
