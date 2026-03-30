import type { Database } from 'sqlite';

export interface ISchemaModule {
  ensureTable?(db: Database): Promise<void>;
  getTableNames?(): string[];
  createTables?(db: Database): Promise<void>;
  createIndexes?(db: Database): Promise<void>;
}
