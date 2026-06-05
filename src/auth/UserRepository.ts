import fs from 'fs';
import path from 'path';
import Database, { type Database as BetterSqliteDatabase } from 'better-sqlite3';
import Debug from 'debug';
import databaseConfig from '@config/databaseConfig';
import type { User, UserRole } from './types';

const debug = Debug('app:UserRepository');

/**
 * Shape of a row in the `auth_users` table. SQLite stores booleans as 0/1
 * and has no native NULL coercion for our domain types, so we keep the raw
 * column types here and convert in {@link UserRepository.rowToUser}.
 */
interface UserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
  last_login: string | null;
  password_hash: string | null;
  tenant_id: string | null;
}

/**
 * Synchronous, durable persistence for the AuthManager user store.
 *
 * AuthManager mutates its user maps synchronously (register/login/update/
 * delete/changePassword), so this repository deliberately uses better-sqlite3's
 * synchronous API rather than the async IDatabase wrapper. This keeps the
 * auth code paths unchanged while making registered users, password changes,
 * and lastLogin survive restarts (previously they lived only in in-memory Maps).
 */
export class UserRepository {
  private db: BetterSqliteDatabase;

  /**
   * @param databasePath Path to the SQLite file, or ':memory:' for tests.
   *                     Defaults to the configured DATABASE_PATH.
   * @param injectedDb  An already-constructed better-sqlite3 Database. Used by
   *                    tests to supply a real in-memory DB (the production path
   *                    opens the file itself). When provided, `databasePath`
   *                    is ignored.
   */
  constructor(databasePath?: string, injectedDb?: BetterSqliteDatabase) {
    if (injectedDb) {
      this.db = injectedDb;
    } else {
      const resolved = databasePath ?? UserRepository.defaultDatabasePath();

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
      debug('UserRepository initialized at %s', resolved);
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
        CREATE TABLE IF NOT EXISTS auth_users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          last_login TEXT,
          password_hash TEXT,
          tenant_id TEXT
        )
      `
      )
      .run();
  }

  private rowToUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role as UserRole,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      passwordHash: row.password_hash ?? undefined,
      tenantId: row.tenant_id ?? undefined,
    };
  }

  /** Load every persisted user (including password hashes). */
  public getAll(): User[] {
    const rows = this.db.prepare('SELECT * FROM auth_users').all() as UserRow[];
    return rows.map((row) => this.rowToUser(row));
  }

  /** Insert a new user or replace the existing row with the same id. */
  public upsert(user: User): void {
    this.db
      .prepare(
        `
        INSERT INTO auth_users (
          id, username, email, role, is_active, created_at, last_login, password_hash, tenant_id
        ) VALUES (
          @id, @username, @email, @role, @is_active, @created_at, @last_login, @password_hash, @tenant_id
        )
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          email = excluded.email,
          role = excluded.role,
          is_active = excluded.is_active,
          created_at = excluded.created_at,
          last_login = excluded.last_login,
          password_hash = excluded.password_hash,
          tenant_id = excluded.tenant_id
      `
      )
      .run({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.isActive ? 1 : 0,
        created_at: user.createdAt,
        last_login: user.lastLogin ?? null,
        password_hash: user.passwordHash ?? null,
        tenant_id: user.tenantId ?? null,
      });
  }

  /** Delete a user by id. Returns true if a row was removed. */
  public delete(userId: string): boolean {
    const info = this.db.prepare('DELETE FROM auth_users WHERE id = ?').run(userId);
    return info.changes > 0;
  }

  /** Whether any user already exists in the store. */
  public count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM auth_users').get() as { n: number };
    return row.n;
  }

  public close(): void {
    this.db.close();
  }
}
