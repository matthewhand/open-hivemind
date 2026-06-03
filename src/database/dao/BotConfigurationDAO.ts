import { Logger } from '@common/logger';
import { encryptionService } from '../EncryptionService';
import type { IDatabase as Database, BotConfiguration as TypesBotConfiguration } from '../types';

// We map our type loosely for type flexibility (allowing parsed objects or stringified variants)
export type BotConfiguration = TypesBotConfiguration;

/**
 * Data Access Object for managing bot configurations in the SQLite database.
 */
export class BotConfigurationDAO {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async create(config: BotConfiguration): Promise<number> {
    const sql = `
      INSERT INTO bot_configurations (
        name, messageProvider, llmProvider, persona, systemInstruction,
        mcpServers, mcpGuard, discord, slack, mattermost, openai, flowise,
        openwebui, openswarm, perplexity, replicate, n8n, tenantId, isActive,
        createdAt, updatedAt, createdBy, updatedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      config.name,
      config.messageProvider,
      config.llmProvider,
      config.persona || null,
      config.systemInstruction || null,
      config.mcpServers ? JSON.stringify(config.mcpServers) : null,
      config.mcpGuard ? JSON.stringify(config.mcpGuard) : null,
      this.encryptField(config.discord),
      this.encryptField(config.slack),
      this.encryptField(config.mattermost),
      this.encryptField(config.openai),
      this.encryptField(config.flowise),
      this.encryptField(config.openwebui),
      this.encryptField(config.openswarm),
      config.perplexity ? JSON.stringify(config.perplexity) : null,
      config.replicate ? JSON.stringify(config.replicate) : null,
      config.n8n ? JSON.stringify(config.n8n) : null,
      config.tenantId || null,
      config.isActive ? 1 : 0,
      config.createdAt.toISOString(),
      config.updatedAt.toISOString(),
      config.createdBy || null,
      config.updatedBy || null,
    ];

    try {
      const result = await this.db.run(sql, params);
      return typeof result.lastID === 'number'
        ? result.lastID
        : parseInt(String(result.lastID ?? 0), 10) || 0;
    } catch (err) {
      Logger.error('Error creating bot configuration:', err);
      throw err;
    }
  }

  async findById(id: number): Promise<BotConfiguration | null> {
    const sql = `SELECT * FROM bot_configurations WHERE id = ?`;

    try {
      const row = await this.db.get(sql, [id]);
      return row ? this.mapRow(row) : null;
    } catch (err) {
      Logger.error('Error finding bot configuration by ID:', err);
      throw err;
    }
  }

  async findByName(name: string): Promise<BotConfiguration | null> {
    const sql = `SELECT * FROM bot_configurations WHERE name = ?`;

    try {
      const row = await this.db.get(sql, [name]);
      return row ? this.mapRow(row) : null;
    } catch (err) {
      Logger.error('Error finding bot configuration by name:', err);
      throw err;
    }
  }

  async findAll(tenantId?: string): Promise<BotConfiguration[]> {
    let sql = `SELECT * FROM bot_configurations`;
    const params: (string | number | boolean | null)[] = [];

    if (tenantId) {
      sql += ' WHERE tenantId = ? OR tenantId IS NULL';
      params.push(tenantId);
    }

    sql += ' ORDER BY createdAt DESC';

    try {
      const rows = await this.db.all(sql, params);
      return rows.map((row) => this.mapRow(row));
    } catch (err) {
      Logger.error('Error finding all bot configurations:', err);
      throw err;
    }
  }

  async findActive(tenantId?: string): Promise<BotConfiguration[]> {
    let sql = `SELECT * FROM bot_configurations WHERE isActive = 1`;
    const params: (string | number | boolean | null)[] = [];

    if (tenantId) {
      sql += ' AND (tenantId = ? OR tenantId IS NULL)';
      params.push(tenantId);
    }

    sql += ' ORDER BY createdAt DESC';

    try {
      const rows = await this.db.all(sql, params);
      return rows.map((row) => this.mapRow(row));
    } catch (err) {
      Logger.error('Error finding active bot configurations:', err);
      throw err;
    }
  }

  async update(id: number, config: Partial<BotConfiguration>): Promise<void> {
    const updates: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    const allowedKeys = new Set([
      'name',
      'messageProvider',
      'llmProvider',
      'llmProfile',
      'responseProfile',
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
      'perplexity',
      'replicate',
      'n8n',
      'tenantId',
      'isActive',
      'createdAt',
      'updatedAt',
      'createdBy',
      'updatedBy',
    ]);

    Object.entries(config).forEach(([key, value]) => {
      if (allowedKeys.has(key) && value !== undefined && key !== 'id') {
        if (
          key === 'mcpServers' ||
          key === 'mcpGuard' ||
          key === 'discord' ||
          key === 'slack' ||
          key === 'mattermost' ||
          key === 'openai' ||
          key === 'flowise' ||
          key === 'openwebui' ||
          key === 'openswarm' ||
          key === 'perplexity' ||
          key === 'replicate' ||
          key === 'n8n'
        ) {
          updates.push(`${key} = ?`);
          params.push(value ? JSON.stringify(value) : null);
        } else if (key === 'isActive') {
          updates.push(`${key} = ?`);
          params.push(value ? 1 : 0);
        } else if (key === 'updatedAt') {
          updates.push(`${key} = ?`);
          params.push(typeof value === 'string' ? value : (value as Date).toISOString());
        } else {
          updates.push(`${key} = ?`);
          params.push(value as string | number | boolean);
        }
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());

    const sql = `UPDATE bot_configurations SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    try {
      await this.db.run(sql, params);
    } catch (err) {
      Logger.error('Error updating bot configuration:', err);
      throw err;
    }
  }

  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM bot_configurations WHERE id = ?`;

    try {
      const result = await this.db.run(sql, [id]);
      return (result.changes ?? 0) > 0;
    } catch (err) {
      Logger.error('Error deleting bot configuration:', err);
      throw err;
    }
  }

  async activate(id: number): Promise<void> {
    const sql = `UPDATE bot_configurations SET isActive = 1, updatedAt = ? WHERE id = ?`;

    try {
      await this.db.run(sql, [new Date().toISOString(), id]);
    } catch (err) {
      Logger.error('Error activating bot configuration:', err);
      throw err;
    }
  }

  async deactivate(id: number): Promise<void> {
    const sql = `UPDATE bot_configurations SET isActive = 0, updatedAt = ? WHERE id = ?`;

    try {
      await this.db.run(sql, [new Date().toISOString(), id]);
    } catch (err) {
      Logger.error('Error deactivating bot configuration:', err);
      throw err;
    }
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    byProvider: Record<string, number>;
    byTenant: Record<string, number>;
  }> {
    try {
      const totalRow = (await this.db.get('SELECT COUNT(*) as total FROM bot_configurations')) as
        | { total: number }
        | undefined;
      const activeRow = (await this.db.get(
        'SELECT COUNT(*) as active FROM bot_configurations WHERE isActive = 1'
      )) as { active: number } | undefined;
      const providerRows = (await this.db.all(
        'SELECT messageProvider, COUNT(*) as count FROM bot_configurations GROUP BY messageProvider'
      )) as { messageProvider: string; count: number }[];
      const tenantRows = (await this.db.all(
        'SELECT COALESCE(tenantId, "default") as tenant, COUNT(*) as count FROM bot_configurations GROUP BY tenantId'
      )) as { tenant: string; count: number }[];

      return {
        total: totalRow?.total ?? 0,
        active: activeRow?.active ?? 0,
        byProvider: providerRows.reduce(
          (acc, row) => {
            acc[row.messageProvider] = row.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byTenant: tenantRows.reduce(
          (acc, row) => {
            acc[row.tenant] = row.count;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    } catch (err) {
      Logger.error('Error getting statistics:', err);
      throw err;
    }
  }

  private mapRow(row: Record<string, unknown>): BotConfiguration {
    return {
      id: row.id as number,
      name: row.name as string,
      messageProvider: row.messageProvider as string,
      llmProvider: row.llmProvider as string,
      persona: row.persona as string | undefined,
      systemInstruction: row.systemInstruction as string | undefined,
      mcpServers: row.mcpServers ? JSON.parse(row.mcpServers as string) : undefined,
      mcpGuard: row.mcpGuard ? JSON.parse(row.mcpGuard as string) : undefined,
      discord: this.decryptField(row.discord),
      slack: this.decryptField(row.slack),
      mattermost: this.decryptField(row.mattermost),
      openai: this.decryptField(row.openai),
      flowise: this.decryptField(row.flowise),
      openwebui: this.decryptField(row.openwebui),
      openswarm: this.decryptField(row.openswarm),
      perplexity: row.perplexity ? JSON.parse(row.perplexity as string) : undefined,
      replicate: row.replicate ? JSON.parse(row.replicate as string) : undefined,
      n8n: row.n8n ? JSON.parse(row.n8n as string) : undefined,
      tenantId: row.tenantId as string | undefined,
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
      createdBy: row.createdBy as string | undefined,
      updatedBy: row.updatedBy as string | undefined,
    };
  }
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
}
