import fs from 'fs';
import os from 'os';
import path from 'path';
import { RefreshTokenRepository } from '../../src/auth/RefreshTokenRepository';

// The global jest config maps `better-sqlite3` to a hand-written mock that only
// understands a fixed set of table names. These persistence tests need real SQL
// (named params, ON CONFLICT, COUNT, the auth_refresh_tokens table), so we load
// the actual better-sqlite3 implementation and inject a real DB instance.
const realBetterSqlitePath = require.resolve('better-sqlite3/lib/index.js');

const RealDatabase = jest.requireActual(realBetterSqlitePath) as unknown as new (
  filename: string
) => import('better-sqlite3').Database;

const DAY_MS = 24 * 60 * 60 * 1000;

describe('RefreshTokenRepository', () => {
  it('round-trips a token through add/has and deletes it', () => {
    const repo = new RefreshTokenRepository(undefined, new RealDatabase(':memory:'));

    repo.add('token-abc', 'user-1', Date.now() + DAY_MS);
    expect(repo.has('token-abc')).toBe(true);
    expect(repo.has('some-other-token')).toBe(false);

    expect(repo.delete('token-abc')).toBe(true);
    expect(repo.has('token-abc')).toBe(false);
    expect(repo.delete('token-abc')).toBe(false);
    repo.close();
  });

  it('stores only a hash, never the raw token', () => {
    const db = new RealDatabase(':memory:');
    const repo = new RefreshTokenRepository(undefined, db);

    repo.add('super-secret-refresh-token', 'user-1', Date.now() + DAY_MS);

    const rows = db.prepare('SELECT token_hash FROM auth_refresh_tokens').all() as {
      token_hash: string;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toContain('super-secret-refresh-token');
    // SHA-256 hex digest
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
    repo.close();
  });

  it('treats expired tokens as absent and purges them via deleteExpired', () => {
    const repo = new RefreshTokenRepository(undefined, new RealDatabase(':memory:'));
    const now = Date.now();

    repo.add('expired-token', 'user-1', now - 1000);
    repo.add('live-token', 'user-1', now + DAY_MS);

    expect(repo.has('expired-token')).toBe(false);
    expect(repo.has('live-token')).toBe(true);
    expect(repo.count()).toBe(2);

    expect(repo.deleteExpired(now)).toBe(1);
    expect(repo.count()).toBe(1);
    expect(repo.has('live-token')).toBe(true);
    repo.close();
  });

  it('removes every token for a user with deleteAllForUser', () => {
    const repo = new RefreshTokenRepository(undefined, new RealDatabase(':memory:'));
    const expiry = Date.now() + DAY_MS;

    repo.add('t1', 'user-1', expiry);
    repo.add('t2', 'user-1', expiry);
    repo.add('t3', 'user-2', expiry);

    expect(repo.deleteAllForUser('user-1')).toBe(2);
    expect(repo.has('t1')).toBe(false);
    expect(repo.has('t2')).toBe(false);
    expect(repo.has('t3')).toBe(true);
    repo.close();
  });

  it('persists tokens durably across separate repository instances (survives restart)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-token-repo-test-'));
    const dbPath = path.join(dir, 'tokens.db');

    try {
      // First "process": issue a token.
      const first = new RefreshTokenRepository(undefined, new RealDatabase(dbPath));
      first.add('survives-restart', 'user-1', Date.now() + DAY_MS);
      first.close();

      // Second "process": a brand-new repository over the same file must see it.
      const second = new RefreshTokenRepository(undefined, new RealDatabase(dbPath));
      expect(second.has('survives-restart')).toBe(true);

      // Logout in the second process revokes it durably.
      expect(second.delete('survives-restart')).toBe(true);
      second.close();

      const third = new RefreshTokenRepository(undefined, new RealDatabase(dbPath));
      expect(third.has('survives-restart')).toBe(false);
      third.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
