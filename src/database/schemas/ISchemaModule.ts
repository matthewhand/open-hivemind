import type { Database } from '../sqliteWrapper';

export interface ISchemaModule {
  createTables?(db: Database): Promise<void>;
  createIndexes?(db: Database): Promise<void>;
}
