import { QuotaManager, type QuotaConfig } from '../../src/services/QuotaManager';
import { InMemoryQuotaStore } from '../../src/services/QuotaStore';

describe('QuotaManager', () => {
  let store: InMemoryQuotaStore;
  let manager: QuotaManager;

  beforeEach(() => {
    store = new InMemoryQuotaStore(600_000); // long cleanup interval for tests
    manager = new QuotaManager(store);
  });

  afterEach(() => {
    store.shutdown();
  });

  // ── Basic tracking ───────────────────────────────────────────────────────

  it('starts with zero usage and full remaining quota', async () => {
    const status = await manager.checkQuota('user-1', 'user');
    expect(status.allowed).toBe(true);
    expect(status.used.minute).toBe(0);
    expect(status.used.hour).toBe(0);
    expect(status.used.day).toBe(0);
    expect(status.used.tokens).toBe(0);
    expect(status.remaining.minute).toBeGreaterThan(0);
  });

  it('increments request counters when consuming quota', async () => {
    await manager.consumeQuota('user-1', 'user');
    await manager.consumeQuota('user-1', 'user');

    const status = await manager.checkQuota('user-1', 'user');
    expect(status.used.minute).toBe(2);
    expect(status.used.hour).toBe(2);
    expect(status.used.day).toBe(2);
    expect(status.allowed).toBe(true);
  });

  it('increments token counters independently', async () => {
    await manager.consumeTokens('user-1', 'user', 500);
    await manager.consumeTokens('user-1', 'user', 300);

    const status = await manager.checkQuota('user-1', 'user');
    expect(status.used.tokens).toBe(800);
    expect(status.used.minute).toBe(0); // requests not affected
  });

  // ── Quota exceeded ───────────────────────────────────────────────────────

  it('returns allowed=false when per-minute limit is reached', async () => {
    manager.setQuotaConfig('user-2', { maxRequestsPerMinute: 3 });

    await manager.consumeQuota('user-2', 'user');
    await manager.consumeQuota('user-2', 'user');
    await manager.consumeQuota('user-2', 'user');

    const status = await manager.checkQuota('user-2', 'user');
    expect(status.allowed).toBe(false);
    expect(status.remaining.minute).toBe(0);
  });

  it('returns allowed=false when per-hour limit is reached', async () => {
    manager.setQuotaConfig('user-3', {
      maxRequestsPerMinute: 1000,
      maxRequestsPerHour: 2,
    });

    await manager.consumeQuota('user-3', 'user');
    await manager.consumeQuota('user-3', 'user');

    const status = await manager.checkQuota('user-3', 'user');
    expect(status.allowed).toBe(false);
    expect(status.remaining.hour).toBe(0);
  });

  it('returns allowed=false when daily token limit is reached', async () => {
    manager.setQuotaConfig('user-4', { maxTokensPerDay: 100 });

    await manager.consumeTokens('user-4', 'user', 100);

    const status = await manager.checkQuota('user-4', 'user');
    expect(status.allowed).toBe(false);
    expect(status.remaining.tokens).toBe(0);
  });

  // ── Entity isolation ─────────────────────────────────────────────────────

  it('isolates quota between different users', async () => {
    manager.setQuotaConfig('alice', { maxRequestsPerMinute: 2 });
    manager.setQuotaConfig('bob', { maxRequestsPerMinute: 2 });

    await manager.consumeQuota('alice', 'user');
    await manager.consumeQuota('alice', 'user');

    const aliceStatus = await manager.checkQuota('alice', 'user');
    const bobStatus = await manager.checkQuota('bob', 'user');

    expect(aliceStatus.allowed).toBe(false);
    expect(bobStatus.allowed).toBe(true);
    expect(bobStatus.used.minute).toBe(0);
  });

  it('isolates quota between users and bots with the same id', async () => {
    manager.setQuotaConfig('entity-1', { maxRequestsPerMinute: 1 });

    await manager.consumeQuota('entity-1', 'user');

    const userStatus = await manager.checkQuota('entity-1', 'user');
    const botStatus = await manager.checkQuota('entity-1', 'bot');

    expect(userStatus.allowed).toBe(false);
    expect(botStatus.allowed).toBe(true);
  });

  // ── Custom config ────────────────────────────────────────────────────────

  it('applies default config when no custom config is set', async () => {
    const config = manager.getQuotaConfig('unknown-user');
    expect(config.maxRequestsPerMinute).toBeGreaterThan(0);
    expect(config.maxRequestsPerHour).toBeGreaterThan(0);
    expect(config.maxRequestsPerDay).toBeGreaterThan(0);
    expect(config.maxTokensPerDay).toBeGreaterThan(0);
  });

  it('merges partial config updates', async () => {
    const original = manager.getQuotaConfig('user-5');
    manager.setQuotaConfig('user-5', { maxRequestsPerMinute: 999 });

    const updated = manager.getQuotaConfig('user-5');
    expect(updated.maxRequestsPerMinute).toBe(999);
    // Other fields remain at default
    expect(updated.maxRequestsPerHour).toBe(original.maxRequestsPerHour);
  });

  // ── Reset ────────────────────────────────────────────────────────────────

  it('resets quota counters for an entity', async () => {
    manager.setQuotaConfig('user-6', { maxRequestsPerMinute: 2 });

    await manager.consumeQuota('user-6', 'user');
    await manager.consumeQuota('user-6', 'user');

    let status = await manager.checkQuota('user-6', 'user');
    expect(status.allowed).toBe(false);

    await manager.resetQuota('user-6', 'user');

    status = await manager.checkQuota('user-6', 'user');
    expect(status.allowed).toBe(true);
    expect(status.used.minute).toBe(0);
  });

  // ── retryAfterSeconds ────────────────────────────────────────────────────

  it('computes retryAfterSeconds as a positive integer', async () => {
    manager.setQuotaConfig('user-7', { maxRequestsPerMinute: 1 });
    await manager.consumeQuota('user-7', 'user');

    const status = await manager.checkQuota('user-7', 'user');
    const retryAfter = manager.retryAfterSeconds(status);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(retryAfter)).toBe(true);
  });

  // ── TTL-based reset (InMemoryQuotaStore) ─────────────────────────────────

  it('TTL-based expiry resets counters automatically', async () => {
    // Create a store with very short TTLs by directly using the store
    const shortStore = new InMemoryQuotaStore(600_000);
    const shortManager = new QuotaManager(shortStore);

    // Increment with a 1-second TTL
    await shortStore.increment('test:key', 1, 5);
    let val = await shortStore.get('test:key');
    expect(val).toBe(5);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    val = await shortStore.get('test:key');
    expect(val).toBe(0); // Expired

    shortStore.shutdown();
  });
});

describe('InMemoryQuotaStore', () => {
  it('increment creates a new key and returns the amount', async () => {
    const store = new InMemoryQuotaStore();
    const val = await store.increment('k1', 60, 3);
    expect(val).toBe(3);
    store.shutdown();
  });

  it('increment accumulates on an existing key', async () => {
    const store = new InMemoryQuotaStore();
    await store.increment('k1', 60, 1);
    const val = await store.increment('k1', 60, 2);
    expect(val).toBe(3);
    store.shutdown();
  });

  it('get returns 0 for missing keys', async () => {
    const store = new InMemoryQuotaStore();
    const val = await store.get('nonexistent');
    expect(val).toBe(0);
    store.shutdown();
  });

  it('delete removes a key', async () => {
    const store = new InMemoryQuotaStore();
    await store.increment('k1', 60, 10);
    await store.delete('k1');
    const val = await store.get('k1');
    expect(val).toBe(0);
    store.shutdown();
  });
});
