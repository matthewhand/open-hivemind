import { Database } from 'sqlite3';
import { Logger } from '../common/logger';

export interface BotConfiguration {
  id?: number;
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona?: string;
  systemInstruction?: string;
  mcpServers?: Array<{ name: string; serverUrl?: string }> | string[];
  mcpGuard?: MCPCGuardConfig;
  discord?: DiscordConfig;
  slack?: SlackConfig;
  mattermost?: MattermostConfig;
  openai?: OpenAIConfig;
  flowise?: FlowiseConfig;
  openwebui?: OpenWebUIConfig;
  openswarm?: OpenSwarmConfig;
  perplexity?: PerplexityConfig;
  replicate?: ReplicateConfig;
  n8n?: N8nConfig;
  tenantId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface MCPCGuardConfig {
  enabled: boolean;
  type: 'owner' | 'custom';
  allowedUserIds?: string[];
}

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

export class BotConfigurationDAO {
  private db: Database;
  private readonly tableName = 'bot_configurations';

  constructor(db: Database) {
    this.db = db;
  }

  async create(config: BotConfiguration): Promise<number> {
    const sql = `
      INSERT INTO ${this.tableName} (
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
      config.discord ? JSON.stringify(config.discord) : null,
      config.slack ? JSON.stringify(config.slack) : null,
      config.mattermost ? JSON.stringify(config.mattermost) : null,
      config.openai ? JSON.stringify(config.openai) : null,
      config.flowise ? JSON.stringify(config.flowise) : null,
      config.openwebui ? JSON.stringify(config.openwebui) : null,
      config.openswarm ? JSON.stringify(config.openswarm) : null,
      config.perplexity ? JSON.stringify(config.perplexity) : null,
      config.replicate ? JSON.stringify(config.replicate) : null,
      config.n8n ? JSON.stringify(config.n8n) : null,
      config.tenantId || null,
      config.isActive ? 1 : 0,
      config.createdAt.toISOString(),
      config.updatedAt.toISOString(),
      config.createdBy || null,
      config.updatedBy || null
    ];

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          Logger.error('Error creating bot configuration:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async findById(id: number): Promise<BotConfiguration | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [id], (err, row: any) => {
        if (err) {
          Logger.error('Error finding bot configuration by ID:', err);
          reject(err);
        } else {
          resolve(row ? this.mapRow(row) : null);
        }
      });
    });
  }

  async findByName(name: string): Promise<BotConfiguration | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE name = ?`;
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [name], (err, row: any) => {
        if (err) {
          Logger.error('Error finding bot configuration by name:', err);
          reject(err);
        } else {
          resolve(row ? this.mapRow(row) : null);
        }
      });
    });
  }

  async findAll(tenantId?: string): Promise<BotConfiguration[]> {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (tenantId) {
      sql += ` WHERE tenantId = ? OR tenantId IS NULL`;
      params.push(tenantId);
    }

    sql += ` ORDER BY createdAt DESC`;

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          Logger.error('Error finding all bot configurations:', err);
          reject(err);
        } else {
          resolve(rows.map(row => this.mapRow(row)));
        }
      });
    });
  }

  async findActive(tenantId?: string): Promise<BotConfiguration[]> {
    let sql = `SELECT * FROM ${this.tableName} WHERE isActive = 1`;
    const params: any[] = [];

    if (tenantId) {
      sql += ` AND (tenantId = ? OR tenantId IS NULL)`;
      params.push(tenantId);
    }

    sql += ` ORDER BY createdAt DESC`;

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          Logger.error('Error finding active bot configurations:', err);
          reject(err);
        } else {
          resolve(rows.map(row => this.mapRow(row)));
        }
      });
    });
  }

  async update(id: number, config: Partial<BotConfiguration>): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];

    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        if (key === 'mcpServers' || key === 'mcpGuard' || key === 'discord' || 
            key === 'slack' || key === 'mattermost' || key === 'openai' || 
            key === 'flowise' || key === 'openwebui' || key === 'openswarm' || 
            key === 'perplexity' || key === 'replicate' || key === 'n8n') {
          updates.push(`${key} = ?`);
          params.push(value ? JSON.stringify(value) : null);
        } else if (key === 'isActive') {
          updates.push(`${key} = ?`);
          params.push(value ? 1 : 0);
        } else if (key === 'updatedAt') {
          updates.push(`${key} = ?`);
          params.push(value.toISOString());
        } else {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updatedAt = ?`);
    params.push(new Date().toISOString());

    const sql = `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ?`;
    params.push(id);

    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          Logger.error('Error updating bot configuration:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [id], function(err) {
        if (err) {
          Logger.error('Error deleting bot configuration:', err);
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async activate(id: number): Promise<void> {
    const sql = `UPDATE ${this.tableName} SET isActive = 1, updatedAt = ? WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [new Date().toISOString(), id], function(err) {
        if (err) {
          Logger.error('Error activating bot configuration:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async deactivate(id: number): Promise<void> {
    const sql = `UPDATE ${this.tableName} SET isActive = 0, updatedAt = ? WHERE id = ?`;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [new Date().toISOString(), id], function(err) {
        if (err) {
          Logger.error('Error deactivating bot configuration:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async getStatistics(): Promise<{
    total: number;
    active: number;
    byProvider: Record<string, number>;
    byTenant: Record<string, number>;
  }> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.get('SELECT COUNT(*) as total FROM ' + this.tableName, (err, totalRow: any) => {
          if (err) return reject(err);

          this.db.get('SELECT COUNT(*) as active FROM ' + this.tableName + ' WHERE isActive = 1', (err, activeRow: any) => {
            if (err) return reject(err);

            this.db.all(
              'SELECT messageProvider, COUNT(*) as count FROM ' + this.tableName + ' GROUP BY messageProvider',
              (err, providerRows: any[]) => {
                if (err) return reject(err);

                this.db.all(
                  'SELECT COALESCE(tenantId, "default") as tenant, COUNT(*) as count FROM ' + this.tableName + ' GROUP BY tenantId',
                  (err, tenantRows: any[]) => {
                    if (err) return reject(err);

                    resolve({
                      total: totalRow.total,
                      active: activeRow.active,
                      byProvider: providerRows.reduce((acc, row) => {
                        acc[row.messageProvider] = row.count;
                        return acc;
                      }, {} as Record<string, number>),
                      byTenant: tenantRows.reduce((acc, row) => {
                        acc[row.tenant] = row.count;
                        return acc;
                      }, {} as Record<string, number>)
                    });
                  }
                );
              }
            );
          });
        });
      });
    });
  }

  private mapRow(row: any): BotConfiguration {
    return {
      id: row.id,
      name: row.name,
      messageProvider: row.messageProvider,
      llmProvider: row.llmProvider,
      persona: row.persona,
      systemInstruction: row.systemInstruction,
      mcpServers: row.mcpServers ? JSON.parse(row.mcpServers) : undefined,
      mcpGuard: row.mcpGuard ? JSON.parse(row.mcpGuard) : undefined,
      discord: row.discord ? JSON.parse(row.discord) : undefined,
      slack: row.slack ? JSON.parse(row.slack) : undefined,
      mattermost: row.mattermost ? JSON.parse(row.mattermost) : undefined,
      openai: row.openai ? JSON.parse(row.openai) : undefined,
      flowise: row.flowise ? JSON.parse(row.flowise) : undefined,
      openwebui: row.openwebui ? JSON.parse(row.openwebui) : undefined,
      openswarm: row.openswarm ? JSON.parse(row.openswarm) : undefined,
      perplexity: row.perplexity ? JSON.parse(row.perplexity) : undefined,
      replicate: row.replicate ? JSON.parse(row.replicate) : undefined,
      n8n: row.n8n ? JSON.parse(row.n8n) : undefined,
      tenantId: row.tenantId,
      isActive: Boolean(row.isActive),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      createdBy: row.createdBy,
      updatedBy: row.updatedBy
    };
  }
}