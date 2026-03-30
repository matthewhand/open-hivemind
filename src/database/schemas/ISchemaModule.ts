import type { Database } from 'sqlite';

export interface ISchemaModule {
  createTables(db: Database): Promise<void>;
  createIndexes(db: Database): Promise<void>;
}
