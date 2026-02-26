// Helper function to properly convert dates
function normalizeDate(dateInput: any): Date {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}

class MockStatement {
  finalize(callback?: (err: Error | null) => void): void {
    callback?.(null);
  }

  run(...args: any[]): MockStatement {
    const callback =
      typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
    callback?.call(this, null);
    return this;
  }
}

class MockDatabase {
  private data: Map<string, any[]>;
  private lastId: number;
  private filename: string;

  constructor(filename: string, _mode?: number, callback?: (err: Error | null) => void) {
    this.filename = filename;
    // Each database instance has its own data store for proper test isolation
    this.data = new Map();
    this.lastId = 1;

    if (callback) {
      setImmediate(() => callback(null));
    }
  }

  clearAllData() {
    this.data.clear();
    this.lastId = 1;
  }

  // Handle case where parameters are passed as an array (common pattern in DatabaseManager)
  private normalizeArgs(args: any[]): any[] {
    if (args.length === 1 && Array.isArray(args[0])) {
      return args[0];
    }
    return args;
  }

  async run(sql: string, ...args: any[]): Promise<{ lastID: number; changes: number }> {
    args = this.normalizeArgs(args);
    let changes = 0;
    let lastID = 0;

    // INSERT operations
    if (sql.includes('INSERT')) {
      const id = this.lastId++;
      lastID = id;
      changes = 1;

      // bot_configurations table
      if (sql.includes('bot_configurations')) {
        if (!this.data.has('bot_configurations')) {
          this.data.set('bot_configurations', []);
        }
        const configs = this.data.get('bot_configurations')!;
        const newConfig = {
          id,
          name: args[0],
          messageProvider: args[1],
          llmProvider: args[2],
          persona: args[3],
          systemInstruction: args[4],
          mcpServers: args[5],
          mcpGuard: args[6],
          discord: args[7],
          slack: args[8],
          mattermost: args[9],
          openai: args[10],
          flowise: args[11],
          openwebui: args[12],
          openswarm: args[13],
          isActive: args[14],
          createdAt: normalizeDate(args[15]),
          updatedAt: normalizeDate(args[16]),
          createdBy: args[17],
          updatedBy: args[18],
        };
        configs.push(newConfig);
      }

      // approval_requests table
      if (sql.includes('approval_requests')) {
        if (!this.data.has('approval_requests')) {
          this.data.set('approval_requests', []);
        }
        const requests = this.data.get('approval_requests')!;
        const newRequest = {
          id,
          resourceType: args[0],
          resourceId: args[1],
          changeType: args[2],
          requestedBy: args[3],
          diff: args[4],
          status: args[5] || 'pending',
          reviewedBy: args[6],
          reviewedAt: args[7],
          reviewComments: args[8],
          tenantId: args[9],
          createdAt: new Date().toISOString(),
        };
        requests.push(newRequest);
      }

      // bot_configuration_versions table
      if (sql.includes('bot_configuration_versions')) {
        if (!this.data.has('bot_configuration_versions')) {
          this.data.set('bot_configuration_versions', []);
        }
        const versions = this.data.get('bot_configuration_versions')!;
        const newVersion = {
          id,
          botConfigurationId: args[0],
          version: args[1],
          name: args[2],
          messageProvider: args[3],
          llmProvider: args[4],
          persona: args[5],
          systemInstruction: args[6],
          mcpServers: args[7],
          mcpGuard: args[8],
          discord: args[9],
          slack: args[10],
          mattermost: args[11],
          openai: args[12],
          flowise: args[13],
          openwebui: args[14],
          openswarm: args[15],
          isActive: args[16],
          createdAt: args[17],
          createdBy: args[18],
          changeLog: args[19],
        };
        versions.push(newVersion);
      }

      // bot_configuration_audit table
      if (sql.includes('bot_configuration_audit')) {
        if (!this.data.has('bot_configuration_audit')) {
          this.data.set('bot_configuration_audit', []);
        }
        const audits = this.data.get('bot_configuration_audit')!;
        const newAudit = {
          id,
          botConfigurationId: args[0],
          action: args[1],
          oldValues: args[2],
          newValues: args[3],
          performedBy: args[4],
          performedAt: args[5] || new Date().toISOString(),
          ipAddress: args[6],
          userAgent: args[7],
        };
        audits.push(newAudit);
      }
    }

    return { lastID, changes };
  }

  async all(sql: string, ...args: any[]): Promise<any[]> {
    args = this.normalizeArgs(args);

    // bot_configurations queries
    if (sql.includes('SELECT') && sql.includes('bot_configurations')) {
      const configs = this.data.get('bot_configurations') || [];

      if (sql.includes('WHERE id =')) {
        const id = args[0];
        return configs.filter((config: any) => config.id === id);
      } else if (sql.includes('ORDER BY updatedAt DESC')) {
        return [...configs].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } else if (sql.includes('IN (')) {
        // Handle bulk queries with IN clause
        const ids = args;
        return configs.filter((config: any) => ids.includes(config.id));
      }
      return configs;
    }

    // approval_requests queries
    if (sql.includes('SELECT') && sql.includes('approval_requests')) {
      const requests = this.data.get('approval_requests') || [];

      if (sql.includes('WHERE id =')) {
        const id = args[0];
        return requests.filter((request: any) => request.id === id);
      } else if (sql.includes('ORDER BY createdAt DESC')) {
        return [...requests].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return requests;
    }

    // bot_configuration_versions queries (bulk)
    if (sql.includes('SELECT') && sql.includes('bot_configuration_versions')) {
      const versions = this.data.get('bot_configuration_versions') || [];

      if (sql.includes('WHERE botConfigurationId IN')) {
        const configIds = args;
        return versions
          .filter((version: any) => configIds.includes(version.botConfigurationId))
          .sort((a, b) => {
            if (a.botConfigurationId !== b.botConfigurationId) {
              return a.botConfigurationId - b.botConfigurationId;
            }
            return b.version.localeCompare(a.version); // Reverse order (DESC)
          });
      }
      return versions;
    }

    // bot_configuration_audit queries (bulk)
    if (sql.includes('SELECT') && sql.includes('bot_configuration_audit')) {
      const audits = this.data.get('bot_configuration_audit') || [];

      if (sql.includes('WHERE botConfigurationId IN')) {
        const configIds = args;
        return audits
          .filter((audit: any) => configIds.includes(audit.botConfigurationId))
          .sort((a, b) => {
            if (a.botConfigurationId !== b.botConfigurationId) {
              return a.botConfigurationId - b.botConfigurationId;
            }
            return new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(); // Reverse order (DESC)
          });
      }
      return audits;
    }

    return [];
  }

  async get(sql: string, ...args: any[]): Promise<any> {
    args = this.normalizeArgs(args);

    // bot_configurations queries
    if (sql.includes('SELECT') && sql.includes('bot_configurations')) {
      const configs = this.data.get('bot_configurations') || [];

      if (sql.includes('WHERE id =')) {
        const id = args[0];
        return configs.find((config: any) => config.id === id);
      } else if (sql.includes('WHERE name =')) {
        const name = args[0];
        return configs.find((config: any) => config.name === name);
      }
    }

    // approval_requests queries
    if (sql.includes('SELECT') && sql.includes('approval_requests')) {
      const requests = this.data.get('approval_requests') || [];

      if (sql.includes('WHERE id =')) {
        const id = args[0];
        return requests.find((request: any) => request.id === id);
      }
    }

    return undefined;
  }

  async exec(_sql: string): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }

  prepare(): MockStatement {
    return new MockStatement();
  }

  serialize(callback: () => void): void {
    callback();
  }

  on(): MockDatabase {
    return this;
  }
}

const sqlite3Mock = {
  Database: MockDatabase,
  verbose: () => sqlite3Mock,
};

export default sqlite3Mock;
module.exports = sqlite3Mock;
