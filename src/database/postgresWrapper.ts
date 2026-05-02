import Debug from 'debug';
import type { Pool, PoolConfig } from 'pg';
import { type IDatabase } from './types';

const debug = Debug('app:PostgresWrapper');

/**
 * Lazily resolve the `pg` module at runtime so that environments running the
 * default SQLite backend do not require `pg` to be installed. Postgres support
 * is opt-in (see `DATABASE_TYPE=postgres`); only consumers that actually
 * instantiate `PostgresWrapper` need the optional `pg` dependency present.
 */

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
function loadPgPool(): typeof import('pg').Pool {
  try {
    const pg = require('pg') as typeof import('pg');
    return pg.Pool;
  } catch (err) {
    const message =
      "The 'pg' module is required to use the Postgres database backend but is not installed. " +
      'Install it with `npm install pg` (and `@types/pg` for TypeScript) or set DATABASE_TYPE=sqlite.';
    throw new Error(message + ` Original error: ${(err as Error).message}`);
  }
}

/**
 * Wrapper around pg providing an async/promise-based API
 * compatible with the IDatabase interface.
 */
export class PostgresWrapper implements IDatabase {
  private pool: Pool;

  constructor(config: string | PoolConfig) {
    debug('POSTGRES_WRAPPER: constructor called');
    const PoolCtor = loadPgPool();
    if (typeof config === 'string') {
      this.pool = new PoolCtor({ connectionString: config });
    } else {
      this.pool = new PoolCtor(config);
    }
  }

  private translateSql(sql: string): string {
    let index = 1;
    let translated = '';
    let inString = false;
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      if (char === "'") inString = !inString;
      if (char === '?' && !inString) {
        translated += '$' + index++;
      } else {
        translated += char;
      }
    }

    // SQLite specific "INSERT OR REPLACE" -> Postgres "INSERT ... ON CONFLICT"
    // This is a naive translation and might need specific handling per query
    // but for simple cases it might work.
    // For now, let's keep it simple and handle specific translations in repositories if needed.

    return translated;
  }

  private mapRow(row: any): any {
    if (!row) return row;
    const mapped: any = {};
    for (const key of Object.keys(row)) {
      // Map known lowercase keys to camelCase
      const camelKey = this.toCamelCase(key);
      mapped[camelKey] = row[key];
    }
    return mapped;
  }

  private toCamelCase(key: string): string {
    // Basic mapping for known fields that postgres lowercases
    const mapping: Record<string, string> = {
      messageid: 'messageId',
      channelid: 'channelId',
      authorid: 'authorId',
      authorname: 'authorName',
      tenantid: 'tenantId',
      created_at: 'created_at', // keep as is or map to createdAt
      updated_at: 'updated_at',
      starttimestamp: 'startTimestamp',
      endtimestamp: 'endTimestamp',
      messagecount: 'messageCount',
      messagesent: 'messagesSent',
      messagereceived: 'messagesReceived',
      conversationshandled: 'conversationsHandled',
      averageresponsetime: 'averageResponseTime',
      lastactivity: 'lastActivity',
      sessionid: 'sessionId',
      botname: 'botName',
      starttime: 'startTime',
      endtime: 'endTime',
      isactive: 'isActive',
      messageprovider: 'messageProvider',
      llmprovider: 'llmProvider',
      systeminstruction: 'systemInstruction',
      mcpservers: 'mcpServers',
      mcpguard: 'mcpGuard',
      createdat: 'createdAt',
      updatedat: 'updatedAt',
      createdby: 'createdBy',
      updatedby: 'updatedBy',
      passwordhash: 'passwordHash',
      roleid: 'roleId',
      lastlogin: 'lastLogin',
      ipaddress: 'ipAddress',
      useragent: 'userAgent',
      resourcetype: 'resourceType',
      resourceid: 'resourceId',
      changetype: 'changeType',
      requestedby: 'requestedBy',
      reviewedby: 'reviewedBy',
      reviewedat: 'reviewedAt',
      reviewcomments: 'reviewComments',
      expectedmean: 'expectedMean',
      standarddeviation: 'standardDeviation',
      zscore: 'zScore',
      probabilityroll: 'probabilityRoll',
      recommendationid: 'recommendationId',
      shouldreply: 'shouldReply',
    };
    return mapping[key] || key;
  }

  async run(
    sql: string,
    params: any[] = []
  ): Promise<{ lastID: number | string; changes: number }> {
    const translatedSql = this.translateSql(sql);

    let finalSql = translatedSql;
    if (sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')) {
      // Don't append RETURNING id for umzug_migrations as it doesn't have an id column
      if (!sql.includes('umzug_migrations')) {
        finalSql += ' RETURNING id';
      }
    }

    const result = await this.pool.query(finalSql, params);

    return {
      lastID: result.rows[0]?.id || 0,
      changes: result.rowCount || 0,
    };
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const translatedSql = this.translateSql(sql);
    const result = await this.pool.query(translatedSql, params);
    return result.rows.map((row) => this.mapRow(row)) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const translatedSql = this.translateSql(sql);
    const result = await this.pool.query(translatedSql, params);
    return this.mapRow(result.rows[0]) as T | undefined;
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    await this.exec('BEGIN');
    try {
      const result = await callback(this);
      await this.exec('COMMIT');
      return result;
    } catch (e) {
      await this.exec('ROLLBACK');
      throw e;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
