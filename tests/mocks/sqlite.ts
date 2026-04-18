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

  constructor(path?: string, options?: any) {
    // Use global store to persist data across instances
    this.data = globalDataStore;
    this.lastId = globalLastId;
    if (path === ':memory:') {
      this.clearAllData();
    }
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
    await mockConfigure(_option, _value);
    return;
  }

  prepare(sql: string) {
    return {
      run: (...args: any[]) => {
        // Handle case where parameters are passed as an array
        if (args.length === 1 && Array.isArray(args[0])) {
          args = args[0];
        }
        
        // Mocking better-sqlite3 style
        mockRun(sql, ...args);
        
        const id = this.lastId++;
        globalLastId = id;

        // Store data based on table
        if (sql.includes('INSERT INTO bot_configurations ')) {
          if (!this.data.has('bot_configurations')) {
            this.data.set('bot_configurations', []);
          }
          this.data.get('bot_configurations')!.push({
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
          });
        } else if (sql.includes('INSERT INTO bot_configuration_versions ')) {
          if (!this.data.has('bot_configuration_versions')) {
            this.data.set('bot_configuration_versions', []);
          }
          this.data.get('bot_configuration_versions')!.push({
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
            createdAt: normalizeDate(args[17]),
            createdBy: args[18],
            changeLog: args[19],
          });
        } else if (sql.includes('INSERT INTO bot_configuration_audit ')) {
          if (!this.data.has('bot_configuration_audit')) {
            this.data.set('bot_configuration_audit', []);
          }
          this.data.get('bot_configuration_audit')!.push({
            id,
            botConfigurationId: args[0],
            action: args[1],
            oldValues: args[2],
            newValues: args[3],
            performedBy: args[4],
            performedAt: normalizeDate(args[5]),
            ipAddress: args[6],
            userAgent: args[7],
          });
        } else if (sql.includes('INSERT INTO approval_requests ')) {
          if (!this.data.has('approval_requests')) {
            this.data.set('approval_requests', []);
          }
          this.data.get('approval_requests')!.push({
            id,
            resourceType: args[0],
            resourceId: args[1],
            changeType: args[2],
            requestedBy: args[3],
            diff: args[4],
            status: args[5] || 'pending',
            reviewedBy: args[6],
            reviewedAt: args[7] ? normalizeDate(args[7]) : undefined,
            reviewComments: args[8],
            tenantId: args[9],
            createdAt: new Date(),
          });
        } else if (sql.includes('UPDATE approval_requests SET ')) {
           const requests = this.data.get('approval_requests') || [];
           const targetId = args[args.length - 1];
           const req = requests.find(r => r.id === targetId);
           if (req) {
             if (sql.includes('status = ?')) req.status = args[0];
             if (sql.includes('reviewedBy = ?')) req.reviewedBy = args[1];
             if (sql.includes('reviewedAt = ?')) req.reviewedAt = normalizeDate(args[2]);
             if (sql.includes('reviewComments = ?')) req.reviewComments = args[3];
             return { lastInsertRowid: targetId, changes: 1 };
           }
           return { lastInsertRowid: targetId, changes: 0 };
        } else if (sql.includes('DELETE FROM approval_requests WHERE id = ?')) {
           const requests = this.data.get('approval_requests') || [];
           const targetId = args[0];
           const index = requests.findIndex(r => r.id === targetId);
           if (index !== -1) {
             requests.splice(index, 1);
             return { lastInsertRowid: targetId, changes: 1 };
           }
           return { lastInsertRowid: targetId, changes: 0 };
        }

        return { lastInsertRowid: id, changes: 1 };
      },
      all: (...args: any[]) => {
        if (args.length === 1 && Array.isArray(args[0])) {
          args = args[0];
        }
        mockAll(sql, ...args);
        
        if (sql.includes('FROM bot_configuration_versions')) {
          const versions = this.data.get('bot_configuration_versions') || [];
          if (args.length > 0) {
            // Handle bulk query (IN clause)
            if (sql.includes(' IN ')) {
               const ids = new Set(args);
               return versions.filter((v: any) => ids.has(v.botConfigurationId));
            }
            return versions.filter((v: any) => v.botConfigurationId === args[0]);
          }
          return versions;
        }
        if (sql.includes('FROM bot_configuration_audit')) {
          const audits = this.data.get('bot_configuration_audit') || [];
          if (args.length > 0) {
             // Handle bulk query (IN clause)
             if (sql.includes(' IN ')) {
                const ids = new Set(args);
                return audits.filter((a: any) => ids.has(a.botConfigurationId));
             }
            return audits.filter((a: any) => a.botConfigurationId === args[0]);
          }
          return audits;
        }
        if (sql.includes('FROM bot_configurations')) {
          return this.data.get('bot_configurations') || [];
        }
        if (sql.includes('FROM approval_requests')) {
           let results = this.data.get('approval_requests') || [];
           if (sql.includes('resourceType = ?')) {
             results = results.filter(r => r.resourceType === args[0]);
           }
           return results;
        }
        return [];
      },
      get: (...args: any[]) => {
        if (args.length === 1 && Array.isArray(args[0])) {
          args = args[0];
        }
        mockGet(sql, ...args);
        
        if (sql.includes('FROM bot_configurations')) {
          const configs = this.data.get('bot_configurations') || [];
          if (args.length > 0) {
             return configs.find((c: any) => c.id === args[0]);
          }
          return configs[0];
        }
        if (sql.includes('FROM approval_requests')) {
           const requests = this.data.get('approval_requests') || [];
           return requests.find(r => r.id === args[0]);
        }
        return undefined;
      }
    };
  }

  async run(sql: string, ...args: any[]): Promise<{ lastID: number; changes: number }> {
    const info = this.prepare(sql).run(...args);
    return { lastID: info.lastInsertRowid as number, changes: info.changes };
  }

  async all(sql: string, ...args: any[]): Promise<any[]> {
    return this.prepare(sql).all(...args);
  }

  async get(sql: string, ...args: any[]): Promise<any> {
    return this.prepare(sql).get(...args);
  }

  async close(): Promise<void> {
    await mockClose();
    return;
  }
}

export const open = jest.fn(async (config: any): Promise<Database> => {
  const db = new Database();
  if (config && (config.path === ':memory:' || config.memory)) {
    db.clearAllData();
  }
  return db;
});

// For better-sqlite3 compatibility (new Database())
const DatabaseExport: any = Database;
DatabaseExport.open = open;
DatabaseExport.mockRun = mockRun;
DatabaseExport.mockGet = mockGet;
DatabaseExport.mockAll = mockAll;
DatabaseExport.mockExec = mockExec;
DatabaseExport.mockClose = mockClose;
DatabaseExport.mockConfigure = mockConfigure;
DatabaseExport.mockDb = mockDb;
DatabaseExport.Database = Database;

export default DatabaseExport;
