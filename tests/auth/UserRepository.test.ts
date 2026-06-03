import os from 'os';
import path from 'path';
import fs from 'fs';
import { UserRepository } from '../../src/auth/UserRepository';
import type { User } from '../../src/auth/types';

// The global jest config maps `better-sqlite3` to a hand-written mock that only
// understands a fixed set of table names. These persistence tests need real SQL
// (named params, ON CONFLICT, COUNT, the auth_users table), so we load the
// actual better-sqlite3 implementation and inject a real DB instance.
// moduleNameMapper rewrites bare specifiers (even via requireActual), so we
// resolve the package's real entry point and require it by absolute path.
const realBetterSqlitePath = require.resolve('better-sqlite3/lib/index.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RealDatabase = jest.requireActual(realBetterSqlitePath) as unknown as new (
  filename: string
) => import('better-sqlite3').Database;

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: overrides.id ?? `id-${Math.random().toString(36).slice(2)}`,
    username: overrides.username ?? 'alice',
    email: overrides.email ?? 'alice@example.com',
    role: overrides.role ?? 'user',
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00.000Z').toISOString(),
    lastLogin: overrides.lastLogin ?? null,
    passwordHash: overrides.passwordHash ?? 'hashed-secret',
    ...overrides,
  };
}

describe('UserRepository', () => {
  it('round-trips a user through upsert/getAll', () => {
    const repo = new UserRepository(undefined, new RealDatabase(':memory:'));
    const user = makeUser();

    repo.upsert(user);
    const all = repo.getAll();

    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(user);
    repo.close();
  });

  it('preserves password hash, lastLogin, isActive and role on update', () => {
    const repo = new UserRepository(undefined, new RealDatabase(':memory:'));
    const user = makeUser({ id: 'u1' });
    repo.upsert(user);

    const updated: User = {
      ...user,
      passwordHash: 'new-hash',
      lastLogin: new Date('2024-02-02T10:00:00.000Z').toISOString(),
      isActive: false,
      role: 'admin',
    };
    repo.upsert(updated);

    const rows = repo.getAll();
    expect(rows).toHaveLength(1);
    expect(rows[0].passwordHash).toBe('new-hash');
    expect(rows[0].lastLogin).toBe(updated.lastLogin);
    expect(rows[0].isActive).toBe(false);
    expect(rows[0].role).toBe('admin');
    repo.close();
  });

  it('deletes a user and reports whether a row was removed', () => {
    const repo = new UserRepository(undefined, new RealDatabase(':memory:'));
    const user = makeUser({ id: 'u2' });
    repo.upsert(user);

    expect(repo.count()).toBe(1);
    expect(repo.delete('u2')).toBe(true);
    expect(repo.count()).toBe(0);
    expect(repo.delete('does-not-exist')).toBe(false);
    repo.close();
  });

  it('persists users durably across separate repository instances (survives restart)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'user-repo-test-'));
    const dbPath = path.join(dir, 'users.db');

    try {
      // First "process": register a user and change a password.
      const first = new UserRepository(undefined, new RealDatabase(dbPath));
      first.upsert(makeUser({ id: 'persist-1', username: 'bob', email: 'bob@example.com' }));
      first.upsert(
        makeUser({
          id: 'persist-1',
          username: 'bob',
          email: 'bob@example.com',
          passwordHash: 'changed-after-restart',
          lastLogin: new Date('2024-03-03T12:00:00.000Z').toISOString(),
        })
      );
      first.close();

      // Second "process": a brand-new repository over the same file must see it.
      const second = new UserRepository(undefined, new RealDatabase(dbPath));
      const loaded = second.getAll();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].username).toBe('bob');
      expect(loaded[0].passwordHash).toBe('changed-after-restart');
      expect(loaded[0].lastLogin).toBe('2024-03-03T12:00:00.000Z');
      second.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
