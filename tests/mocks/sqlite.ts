// Global data store to persist across database instances
const globalDataStore: Map<string, any[]> = new Map();
let globalLastId = 1;

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

// Mock functions for testing - these are jest mocks that can be cleared/checked
export const mockRun = jest.fn();
export const mockGet = jest.fn();
export const mockAll = jest.fn();
export const mockExec = jest.fn();
export const mockClose = jest.fn();
export const mockConfigure = jest.fn();
export const mockDb = {
  run: mockRun,
  get: mockGet,
  all: mockAll,
  exec: mockExec,
  close: mockClose,
  configure: mockConfigure,
};

export class Database {
  private lastId: number;
  private data: Map<string, any[]>;

  constructor() {
    // Use global store to persist data across instances
    this.data = globalDataStore;
    this.lastId = globalLastId;
  }

  // Clear all data - useful for test isolation
  clearAllData() {
    this.data.clear();
    globalLastId = 1;
    this.lastId = 1;
  }

  async exec(sql: string): Promise<void> {
    // Call the mock function for tracking
    await mockExec(sql);
    return;
  }

  async configure(_option: string, _value: any): Promise<void> {
    return;
  }

  async run(sql: string, ...args: any[]): Promise<{ lastID: number; changes: number }> {
    // Call the mock function for tracking and get its result if mock was set up
    const mockResult = await mockRun(sql, ...args);

    // If the mock returned a specific value (via mockResolvedValueOnce), use it
    if (mockResult !== undefined) {
      return mockResult;
    }

    let changes = 0;
    let lastID = 0;

    // Handle case where parameters are passed as an array (common pattern in DatabaseManager)
    if (args.length === 1 && Array.isArray(args[0])) {
      args = args[0];
    }

    // INSERT operations
    if (sql.includes('INSERT')) {
      const id = this.lastId++;
      globalLastId = id;
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

    // UPDATE operations
    if (sql.includes('UPDATE')) {
      if (sql.includes('approval_requests')) {
        const requests = this.data.get('approval_requests') || [];
        const requestId = args[args.length - 1]; // Last argument is usually the ID
        const request = requests.find((r: any) => r.id === requestId);
        if (request) {
          // Update fields based on the SET clause
          if (sql.includes('status = ?')) {
            const statusIndex = sql.indexOf('status = ?');
            const statusArg = args
              .slice(0, -1)
              .find(
                (arg: any, index: number) =>
                  sql.substring(0, statusIndex).split(',').length === index + 1
              );
            if (statusArg) request.status = statusArg;
          }
          if (sql.includes('reviewedBy = ?')) {
            const reviewedByIndex = sql.indexOf('reviewedBy = ?');
            const reviewedByArg = args
              .slice(0, -1)
              .find(
                (arg: any, index: number) =>
                  sql.substring(0, reviewedByIndex).split(',').length === index + 1
              );
            if (reviewedByArg) request.reviewedBy = reviewedByArg;
          }
          if (sql.includes('reviewedAt = ?')) {
            request.reviewedAt = new Date().toISOString();
          }
          if (sql.includes('reviewComments = ?')) {
            const reviewCommentsIndex = sql.indexOf('reviewComments = ?');
            const reviewCommentsArg = args
              .slice(0, -1)
              .find(
                (arg: any, index: number) =>
                  sql.substring(0, reviewCommentsIndex).split(',').length === index + 1
              );
            if (reviewCommentsArg) request.reviewComments = reviewCommentsArg;
          }
          changes = 1;
        }
      }

      if (sql.includes('bot_configurations')) {
        const configs = this.data.get('bot_configurations') || [];
        const configId = args[args.length - 1];
        const config = configs.find((c: any) => c.id === configId);
        if (config) {
          // Handle various UPDATE operations for bot_configurations
          if (sql.includes('isActive = ?')) {
            const isActiveIndex = sql.indexOf('isActive = ?');
            const isActiveArg = args
              .slice(0, -1)
              .find(
                (arg: any, index: number) =>
                  sql.substring(0, isActiveIndex).split(',').length === index + 1
              );
            if (isActiveArg !== undefined) config.isActive = isActiveArg;
          }
          changes = 1;
        }
      }
    }

    // DELETE operations
    if (sql.includes('DELETE')) {
      if (sql.includes('approval_requests')) {
        const requests = this.data.get('approval_requests') || [];
        const requestId = args[0];
        const originalLength = requests.length;
        const filtered = requests.filter((r: any) => r.id !== requestId);
        this.data.set('approval_requests', filtered);
        changes = originalLength - filtered.length;
      }

      if (sql.includes('bot_configurations')) {
        const configs = this.data.get('bot_configurations') || [];
        const configId = args[0];
        const originalLength = configs.length;
        const filtered = configs.filter((c: any) => c.id !== configId);
        this.data.set('bot_configurations', filtered);
        changes = originalLength - filtered.length;
      }

      if (sql.includes('bot_configuration_versions')) {
        const versions = this.data.get('bot_configuration_versions') || [];
        const configId = args[0];
        const version = args[1];
        const originalLength = versions.length;
        const filtered = versions.filter(
          (v: any) => !(v.botConfigurationId === configId && v.version === version)
        );
        this.data.set('bot_configuration_versions', filtered);
        changes = originalLength - filtered.length;
      }
    }

    return { lastID, changes };
  }

  async all(sql: string, ...args: any[]): Promise<any[]> {
    // Call the mock function for tracking and get its result if mock was set up
    const mockResult = await mockAll(sql, ...args);

    // If the mock returned a specific value (via mockResolvedValueOnce), use it
    if (mockResult !== undefined) {
      return mockResult;
    }

    // Handle case where parameters are passed as an array (common pattern in DatabaseManager)
    if (args.length === 1 && Array.isArray(args[0])) {
      args = args[0];
    }

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

    // messages queries
    if (sql.includes('messages')) {
      return this.data.get('messages') || [];
    }

    // anomalies queries
    if (sql.includes('anomalies')) {
      return this.data.get('anomalies') || [];
    }

    // bot_metrics queries
    if (sql.includes('bot_metrics')) {
      return this.data.get('bot_metrics') || [];
    }

    return [];
  }

  async get(sql: string, ...args: any[]): Promise<any> {
    // Call the mock function for tracking and get its result if mock was set up
    const mockResult = await mockGet(sql, ...args);

    // If the mock returned a specific value (via mockResolvedValueOnce), use it
    if (mockResult !== undefined) {
      return mockResult;
    }

    // Handle case where parameters are passed as an array (common pattern in DatabaseManager)
    if (args.length === 1 && Array.isArray(args[0])) {
      args = args[0];
    }

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

  async close(): Promise<void> {
    // Call the mock function for tracking
    await mockClose();
    return;
  }
}

export const open = jest.fn(async (config: any): Promise<Database> => {
  const db = new Database();
  // Clear data if using in-memory database for test isolation
  if (config && (config.path === ':memory:' || config.memory)) {
    db.clearAllData();
  }
  return db;
});

export default {
  open,
  Database,
  mockRun,
  mockGet,
  mockAll,
  mockExec,
  mockClose,
  mockConfigure,
  mockDb,
};
