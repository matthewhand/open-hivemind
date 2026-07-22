import { createPool, type Pool, type PoolConnection } from 'mysql2/promise';
import { type IDatabase } from './types';

export class MySQLWrapper implements IDatabase {
  private pool: Pool;

  constructor(
    config:
      | string
      | { host?: string; port?: number; user?: string; password?: string; database?: string }
  ) {
    if (typeof config === 'string') {
      this.pool = createPool({ uri: config });
    } else {
      this.pool = createPool({
        host: config.host ?? 'localhost',
        port: config.port ?? 3306,
        user: config.user,
        password: config.password,
        database: config.database,
      });
    }
  }

  async run(
    sql: string,
    params: any[] = [],
    client?: PoolConnection
  ): Promise<{ lastID: number | string; changes: number }> {
    const [result] = await (client ?? this.pool).execute(sql, params);
    const header = result as any;
    const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
    return {
      lastID: isInsert ? header.insertId || 0 : 0,
      changes: header.affectedRows || 0,
    };
  }

  async all<T = any>(sql: string, params: any[] = [], client?: PoolConnection): Promise<T[]> {
    const [rows] = await (client ?? this.pool).execute(sql, params);
    return rows as T[];
  }

  async get<T = any>(
    sql: string,
    params: any[] = [],
    client?: PoolConnection
  ): Promise<T | undefined> {
    const [rows] = await (client ?? this.pool).execute(sql, params);
    return (rows as T[])[0];
  }

  async exec(sql: string, client?: PoolConnection): Promise<void> {
    await (client ?? this.pool).execute(sql);
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const txDb: IDatabase = {
        run: (sql: string, params?: any[]) => this.run(sql, params, conn),
        all: (sql: string, params?: any[]) => this.all(sql, params, conn),
        get: (sql: string, params?: any[]) => this.get(sql, params, conn),
        exec: (sql: string) => this.exec(sql, conn),
        transaction: () => Promise.reject(new Error('Nested transactions are not supported')),
        close: () => Promise.resolve(),
      };
      const result = await callback(txDb);
      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
