import { Pool, PoolConfig } from 'pg';
import Debug from 'debug';
import { IDatabase } from './types';

const debug = Debug('app:PostgresWrapper');

/**
 * Wrapper around pg providing an async/promise-based API
 * compatible with the IDatabase interface.
 */
export class PostgresWrapper implements IDatabase {
  private pool: Pool;

  constructor(config: string | PoolConfig) {
    debug('POSTGRES_WRAPPER: constructor called');
    if (typeof config === 'string') {
      this.pool = new Pool({ connectionString: config });
    } else {
      this.pool = new Pool(config);
    }
  }

  private translateSql(sql: string): string {
    // Replace ? with $1, $2, etc.
    let index = 1;
    let translated = sql.replace(/\?/g, () => `$${index++}`);
    
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

  async run(sql: string, params: any[] = []): Promise<{ lastID: number | string; changes: number }> {
    const translatedSql = this.translateSql(sql);
    
    // If it's an INSERT, we might want the ID back. 
    // Postgres requires RETURNING id.
    let finalSql = translatedSql;
    if (sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')) {
      finalSql += ' RETURNING id';
    }

    const result = await this.pool.query(finalSql, params);
    
    return { 
      lastID: result.rows[0]?.id || 0, 
      changes: result.rowCount || 0 
    };
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const translatedSql = this.translateSql(sql);
    const result = await this.pool.query(translatedSql, params);
    return result.rows.map(row => this.mapRow(row)) as T[];
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const translatedSql = this.translateSql(sql);
    const result = await this.pool.query(translatedSql, params);
    return this.mapRow(result.rows[0]) as T | undefined;
  }

  async exec(sql: string): Promise<void> {
    // exec in sqlite-wrapper executes multiple statements separated by ;
    // pg.query can also do this if no parameters are provided.
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
