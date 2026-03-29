import type { Database } from 'sqlite';

export interface ISchemaModule {
  ensureTable(db: Database): Promise<void>;
  getTableNames(): string[];
}
