import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Core tables: bots, mcp_servers, personas, bot_configs, mcp_templates,
 * provider_configs, sessions, user_permissions, bot_user_mappings,
 * bot_templates, bot_versions, bot_approvals
 */
export class CoreSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Bots table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        config TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // MCP servers table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS mcp_servers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        endpoint TEXT NOT NULL,
        auth_token TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Personas table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS personas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Bot configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_configs (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        config_key TEXT NOT NULL,
        config_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // MCP templates table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS mcp_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Provider configurations table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS provider_configs (
        id TEXT PRIMARY KEY,
        provider_name TEXT NOT NULL UNIQUE,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Sessions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_data TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // User permissions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        permission TEXT NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES sessions (user_id) ON DELETE CASCADE
      )
    `
    );

    // Bot-to-user mappings table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_user_mappings (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES sessions (user_id) ON DELETE CASCADE,
        UNIQUE(bot_id, user_id)
      )
    `
    );

    // Bot templates table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    );

    // Bot versions table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_versions (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        version_number TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot approvals table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_approvals (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        approver_id TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Bots indexes
      'CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status)',
      'CREATE INDEX IF NOT EXISTS idx_bots_provider ON bots(provider)',
      'CREATE INDEX IF NOT EXISTS idx_bots_created_at ON bots(created_at)',

      // MCP servers indexes
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status)',
      'CREATE INDEX IF NOT EXISTS idx_mcp_servers_created_at ON mcp_servers(created_at)',

      // Personas indexes
      'CREATE INDEX IF NOT EXISTS idx_personas_name ON personas(name)',

      // Bot configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_configs_bot_id ON bot_configs(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_configs_config_key ON bot_configs(config_key)',

      // MCP templates indexes
      'CREATE INDEX IF NOT EXISTS idx_mcp_templates_name ON mcp_templates(name)',

      // Provider configurations indexes
      'CREATE INDEX IF NOT EXISTS idx_provider_configs_provider_name ON provider_configs(provider_name)',

      // Sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)',

      // User permissions indexes
      'CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission)',

      // Bot-to-user mappings indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_user_mappings_bot_id ON bot_user_mappings(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_user_mappings_user_id ON bot_user_mappings(user_id)',

      // Bot templates indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_templates_name ON bot_templates(name)',

      // Bot versions indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_versions_bot_id ON bot_versions(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_versions_version_number ON bot_versions(version_number)',

      // Bot approvals indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_bot_id ON bot_approvals(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_approver_id ON bot_approvals(approver_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_approvals_status ON bot_approvals(status)',
    ];

    for (const indexSql of indexes) {
      await this.createIndex(db, indexSql);
    }
  }

  private async createTable(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (err: any) {
      Logger.error(`Error creating table: ${err.message}`);
      throw err;
    }
  }

  private async createIndex(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (err: any) {
      Logger.error(`Error creating index: ${err.message}`);
    }
  }
}
