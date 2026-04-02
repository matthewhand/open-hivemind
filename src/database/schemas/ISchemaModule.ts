import type { Database } from 'sqlite';

export interface ISchemaModule {
  getTableNames?(): string[];
  createTables?(db: Database): Promise<void>;
  createIndexes?(db: Database): Promise<void>;
}
