import { InMemoryQuotaStore } from '../../../src/services/QuotaStore';

describe('InMemoryQuotaStore', () => {
  let store: InMemoryQuotaStore;

  beforeEach(() => {
    store = new InMemoryQuotaStore(600_000); // 10 min cleanup
  });

  afterEach(() => {
    store.shutdown();
  });

  it('should increment and get values', async () => {
    await store.increment('test-key', 60, 5);
    const val = await store.get('test-key');
    expect(val).toBe(5);
  });

  it('should accumulate increments', async () => {
    await store.increment('test-key', 60, 5);
    await store.increment('test-key', 60, 10);
    const val = await store.get('test-key');
    expect(val).toBe(15);
  });

  it('should return 0 for non-existent keys', async () => {
    const val = await store.get('none');
    expect(val).toBe(0);
  });

  it('should delete keys', async () => {
    await store.increment('test-key', 60, 5);
    await store.delete('test-key');
    const val = await store.get('test-key');
    expect(val).toBe(0);
  });
});
