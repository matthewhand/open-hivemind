import type { IDatabase as Database } from '../types';

export interface ISchemaModule {
  createTables?(db: Database): Promise<void>;
  createIndexes?(db: Database): Promise<void>;
}
