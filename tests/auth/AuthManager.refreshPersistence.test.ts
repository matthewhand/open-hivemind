import { AuthManager } from '../../src/auth/AuthManager';
import { RefreshTokenRepository } from '../../src/auth/RefreshTokenRepository';

// Load the real better-sqlite3 (the global jest mock only understands a fixed
// set of table names) and inject an in-memory DB into the repository.
const realBetterSqlitePath = require.resolve('better-sqlite3/lib/index.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RealDatabase = jest.requireActual(realBetterSqlitePath) as unknown as new (
  filename: string
) => import('better-sqlite3').Database;

/**
 * Integration of AuthManager with the durable refresh-token allow-list.
 *
 * Under NODE_ENV=test AuthManager skips opening the store itself, so these
 * tests inject a real (in-memory SQLite) RefreshTokenRepository and verify:
 *  - issued tokens are written through to the store,
 *  - a token that is *only* in the store (in-memory Set lost, i.e. restart)
 *    still refreshes successfully,
 *  - rotation revokes the old token durably and persists the new one,
 *  - logout revokes durably.
 */
describe('AuthManager durable refresh-token allow-list', () => {
  let auth: AuthManager;
  let repo: RefreshTokenRepository;

  beforeEach(async () => {
    (AuthManager as unknown as { instance?: AuthManager }).instance = undefined;
    auth = AuthManager.getInstance();
    repo = new RefreshTokenRepository(undefined, new RealDatabase(':memory:'));
    (auth as unknown as { refreshTokenRepo: RefreshTokenRepository | null }).refreshTokenRepo =
      repo;
    await auth.register({
      username: 'carol',
      email: 'carol@example.com',
      password: 'password123',
    });
  });

  afterEach(() => {
    repo.close();
    (AuthManager as unknown as { instance?: AuthManager }).instance = undefined;
  });

  const inMemorySet = (): Set<string> =>
    (auth as unknown as { refreshTokens: Set<string> }).refreshTokens;

  it('persists the refresh token on login', async () => {
    const { refreshToken } = await auth.login({ username: 'carol', password: 'password123' });
    expect(repo.has(refreshToken)).toBe(true);
  });

  it('accepts a persisted token after the in-memory set is lost (restart)', async () => {
    const { refreshToken } = await auth.login({ username: 'carol', password: 'password123' });

    // Simulate a process restart: the Set dies, the durable store does not.
    inMemorySet().clear();

    const rotated = await auth.refreshToken(refreshToken);
    expect(rotated.refreshToken).toBeTruthy();

    // Rotation: old token revoked durably, new token persisted durably.
    expect(repo.has(refreshToken)).toBe(false);
    expect(repo.has(rotated.refreshToken)).toBe(true);

    // The old token must no longer be usable at all.
    await expect(auth.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
  });

  it('revokes the token durably on logout', async () => {
    const { refreshToken } = await auth.login({ username: 'carol', password: 'password123' });

    await auth.logout(refreshToken);

    expect(repo.has(refreshToken)).toBe(false);
    inMemorySet().clear(); // even after a "restart" it must stay revoked
    await expect(auth.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
  });

  it('rejects tokens that are in neither the set nor the store', async () => {
    await expect(auth.refreshToken('never-issued')).rejects.toThrow('Invalid refresh token');
  });
});
