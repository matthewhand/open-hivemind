import { SessionStore } from '@src/auth/SessionStore';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  afterEach(() => {
    store.shutdown();
  });

  it('stores a session and validates its token', async () => {
    await store.storeSession('user-1', 'token-abc', 'admin');
    await expect(store.validateToken('token-abc')).resolves.toBe(true);
  });

  it('reports unknown tokens as invalid', async () => {
    await expect(store.validateToken('nope')).resolves.toBe(false);
  });

  it('hasToken distinguishes tracked from untracked tokens', async () => {
    await store.storeSession('user-1', 'token-abc', 'user');
    expect(store.hasToken('token-abc')).toBe(true);
    expect(store.hasToken('other-token')).toBe(false);
  });

  it('invalidates a specific token without touching others', async () => {
    await store.storeSession('user-1', 'token-1', 'user');
    await store.storeSession('user-2', 'token-2', 'user');

    await store.invalidateToken('token-1');

    expect(store.hasToken('token-1')).toBe(false);
    expect(store.hasToken('token-2')).toBe(true);
  });

  it('invalidates all sessions for a user', async () => {
    await store.storeSession('user-1', 'token-a', 'user');
    await store.storeSession('user-1', 'token-b', 'user');
    await store.storeSession('user-2', 'token-c', 'user');

    await store.invalidateUserSessions('user-1');

    expect(store.hasToken('token-a')).toBe(false);
    expect(store.hasToken('token-b')).toBe(false);
    expect(store.hasToken('token-c')).toBe(true);
  });

  it('treats expired sessions as invalid and removes them', async () => {
    await store.storeSession('user-1', 'token-exp', 'user');

    // Force expiry by reaching into the store via getStats then manual advance.
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 25 * 60 * 60 * 1000); // +25h (TTL is 24h)

    await expect(store.validateToken('token-exp')).resolves.toBe(false);
    expect(store.hasToken('token-exp')).toBe(false);

    jest.useRealTimers();
  });

  it('reports stats about tracked sessions and users', async () => {
    await store.storeSession('user-1', 'token-a', 'user');
    await store.storeSession('user-2', 'token-b', 'user');

    const stats = store.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalUsers).toBe(2);
    expect(stats.maxSessions).toBeGreaterThan(0);
  });
});
