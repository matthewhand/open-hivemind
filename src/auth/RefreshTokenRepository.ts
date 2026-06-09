import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Database, { type Database as BetterSqliteDatabase } from 'better-sqlite3';
import Debug from 'debug';
import databaseConfig from '@config/databaseConfig';

const debug = Debug('app:RefreshTokenRepository');

/**
 * Shape of a row in the `auth_refresh_tokens` table.
 */
interface RefreshTokenRow {
  token_hash: string;
  user_id: string;
  created_at: string;
  expires_at: number;
}

/**
 * Synchronous, durable persistence for the AuthManager refresh-token
 * allow-list.
 *
 * Previously the allow-list lived only in an in-memory Set, so every issued
 * refresh token died on process restart and users were forced to log in
 * again. This repository mirrors the {@link UserRepository} pattern
 * (better-sqlite3, synchronous API) because AuthManager mutates the
 * allow-list synchronously inside its login/refresh/logout paths.
 *
 * Tokens are stored as SHA-256 hashes — a leaked database never yields
 * usable refresh tokens. Membership checks therefore hash the presented
 * token and look the digest up.
 */
export class RefreshTokenRepository {
  private db: BetterSqliteDatabase;

  /**
   * @param databasePath Path to the SQLite file, or ':memory:' for tests.
   *                     Defaults to the configured DATABASE_PATH.
   * @param injectedDb  An already-constructed better-sqlite3 Database. Used by
   *                    tests to supply a real in-memory DB. When provided,
   *                    `databasePath` is ignored.
   */
  constructor(databasePath?: string, injectedDb?: BetterSqliteDatabase) {
    if (injectedDb) {
      this.db = injectedDb;
    } else {
      const resolved = databasePath ?? RefreshTokenRepository.defaultDatabasePath();

      if (resolved !== ':memory:') {
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }

      let DBConstructor: typeof Database = Database;
      if (typeof DBConstructor !== 'function') {
        const maybeDefault = (Database as unknown as { default?: typeof Database }).default;
        if (typeof maybeDefault === 'function') {
          DBConstructor = maybeDefault;
        }
      }

      this.db = new DBConstructor(resolved);
      debug('RefreshTokenRepository initialized at %s', resolved);
    }

    try {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('busy_timeout = 5000');
    } catch (err) {
      debug('Failed to apply PRAGMAs (continuing):', err);
    }

    this.createTable();
  }

  private static defaultDatabasePath(): string {
    const configured = databaseConfig.get('DATABASE_PATH');
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }

  private createTable(): void {
    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        )
      `
      )
      .run();
    this.db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires
         ON auth_refresh_tokens(expires_at)`
      )
      .run();
  }

  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Persist a refresh token (hashed) with its owner and expiry. */
  public add(token: string, userId: string, expiresAtMs: number): void {
    this.db
      .prepare(
        `
        INSERT INTO auth_refresh_tokens (token_hash, user_id, created_at, expires_at)
        VALUES (@token_hash, @user_id, @created_at, @expires_at)
        ON CONFLICT(token_hash) DO UPDATE SET
          user_id = excluded.user_id,
          expires_at = excluded.expires_at
      `
      )
      .run({
        token_hash: RefreshTokenRepository.hashToken(token),
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: expiresAtMs,
      });
  }

  /** Whether the token is on the allow-list and not yet expired. */
  public has(token: string, nowMs: number = Date.now()): boolean {
    const row = this.db
      .prepare('SELECT 1 AS present FROM auth_refresh_tokens WHERE token_hash = ? AND expires_at > ?')
      .get(RefreshTokenRepository.hashToken(token), nowMs) as { present: number } | undefined;
    return row !== undefined;
  }

  /** Remove a token from the allow-list. Returns true if a row was removed. */
  public delete(token: string): boolean {
    const info = this.db
      .prepare('DELETE FROM auth_refresh_tokens WHERE token_hash = ?')
      .run(RefreshTokenRepository.hashToken(token));
    return info.changes > 0;
  }

  /** Remove every token belonging to a user (e.g. on account deletion). */
  public deleteAllForUser(userId: string): number {
    const info = this.db
      .prepare('DELETE FROM auth_refresh_tokens WHERE user_id = ?')
      .run(userId);
    return info.changes;
  }

  /** Purge expired tokens. Returns the number of rows removed. */
  public deleteExpired(nowMs: number = Date.now()): number {
    const info = this.db
      .prepare('DELETE FROM auth_refresh_tokens WHERE expires_at <= ?')
      .run(nowMs);
    return info.changes;
  }

  /** Number of tokens currently stored (including expired, pre-purge). */
  public count(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM auth_refresh_tokens')
      .get() as { n: number };
    return row.n;
  }

  public close(): void {
    this.db.close();
  }
}
