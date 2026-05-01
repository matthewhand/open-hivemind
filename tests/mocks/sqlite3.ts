import { mockAll, mockClose, mockExec, mockGet, mockRun } from './sqlite';

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
  private db: MockDatabase;
  private sql: string;

  constructor(db: MockDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  run(...args: any[]): any {
    mockRun(this.sql, ...args);
    return (this.db as any).runSync(this.sql, ...args);
  }

  get(...args: any[]): any {
    mockGet(this.sql, ...args);
    return (this.db as any).getSync(this.sql, ...args);
  }

  all(...args: any[]): any[] {
    mockAll(this.sql, ...args);
    return (this.db as any).allSync(this.sql, ...args);
  }

  finalize(callback?: (err: Error | null) => void): void {
    callback?.(null);
  }
}

class MockDatabase {
  private tables: Map<string, Map<number, any>> = new Map();
  private lastIds: Map<string, number> = new Map();

  constructor(_filename: string, _mode?: number, callback?: (err: Error | null) => void) {
    if (callback) {
      setImmediate(() => callback(null));
    }
  }

  prepare(sql: string): MockStatement {
    return new MockStatement(this, sql);
  }

  exec(sql: string): void {
    mockExec(sql);
  }

  close(): void {
    mockClose();
  }

  private normalizeArgs(args: any[]): any[] {
    if (args.length === 1 && Array.isArray(args[0])) {
      return args[0];
    }
    return args;
  }

  private getTableName(sql: string): string | null {
    const lowerSql = sql.toLowerCase();
    if (lowerSql.includes('bot_configurations')) return 'bot_configurations';
    if (lowerSql.includes('approval_requests')) return 'approval_requests';
    if (lowerSql.includes('messages')) return 'messages';
    if (lowerSql.includes('anomalies')) return 'anomalies';
    if (lowerSql.includes('bot_metrics')) return 'bot_metrics';
    if (lowerSql.includes('ai_feedback')) return 'ai_feedback';
    if (lowerSql.includes('bot_configuration_versions')) return 'bot_configuration_versions';
    if (lowerSql.includes('bot_configuration_audit')) return 'bot_configuration_audit';
    return null;
  }

  runSync(
    sql: string,
    ...args: any[]
  ): { lastInsertRowid: number; changes: number; lastID: number } {
    const params = this.normalizeArgs(args);
    const tableName = this.getTableName(sql);
    let lastInsertRowid = 0;
    let changes = 0;

    if (sql.includes('INSERT')) {
      if (tableName) {
        if (!this.tables.has(tableName)) this.tables.set(tableName, new Map());
        const id = (this.lastIds.get(tableName) || 0) + 1;
        this.lastIds.set(tableName, id);

        const data: any = { id, createdAt: new Date() };

        // Comprehensive mapping for common tables
        if (tableName === 'approval_requests') {
          data.resourceType = params[0];
          data.resourceId = params[1];
          data.changeType = params[2];
          data.requestedBy = params[3];
          data.diff = params[4];
          data.status = params[5] || 'pending';
          data.reviewedBy = params[6];
          data.reviewedAt = params[7];
          data.reviewComments = params[8];
          data.tenantId = params[9];
        }

        this.tables.get(tableName)!.set(id, data);
        lastInsertRowid = id;
        changes = 1;
      }
    } else if (sql.includes('UPDATE')) {
      changes = 1;
      if (tableName && sql.includes('WHERE id = ?')) {
        const id = params[params.length - 1];
        const record = this.tables.get(tableName)?.get(id);
        if (record) {
          if (sql.includes('status = ?')) record.status = params[0];
          if (sql.includes('reviewedBy = ?')) record.reviewedBy = params[1];
          if (sql.includes('reviewedAt = ?')) record.reviewedAt = params[2];
          if (sql.includes('reviewComments = ?')) record.reviewComments = params[3];
        } else {
          changes = 0;
        }
      }
    } else if (sql.includes('DELETE')) {
      changes = 1;
      if (tableName && sql.includes('WHERE id = ?')) {
        const id = params[0];
        if (this.tables.get(tableName)?.has(id)) {
          this.tables.get(tableName)!.delete(id);
        } else {
          changes = 0;
        }
      }
    }

    return { lastInsertRowid, lastID: lastInsertRowid, changes };
  }

  getSync(sql: string, ...args: any[]): any {
    const params = this.normalizeArgs(args);
    const tableName = this.getTableName(sql);

    if (sql.includes('SELECT') && tableName) {
      if (sql.includes('WHERE id = ?')) {
        return this.tables.get(tableName)?.get(params[0]);
      }
    }
    return undefined;
  }

  allSync(sql: string, ...args: any[]): any[] {
    const tableName = this.getTableName(sql);
    if (sql.includes('SELECT') && tableName) {
      return Array.from(this.tables.get(tableName)?.values() || []);
    }
    return [];
  }
}

const sqlite3Mock = MockDatabase as any;
sqlite3Mock.Database = MockDatabase;
sqlite3Mock.verbose = () => sqlite3Mock;

export default sqlite3Mock;
module.exports = sqlite3Mock;
