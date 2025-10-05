const getDatabaseManager = () => require('../../../src/database/DatabaseManager').DatabaseManager as typeof import('../../../src/database/DatabaseManager').DatabaseManager;

describe('DatabaseManager optional configuration handling', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('provides a singleton instance even when configuration is absent', async () => {
    const DatabaseManager = getDatabaseManager();
    const manager = DatabaseManager.getInstance();

    expect(manager).toBeDefined();
    expect(manager.isConfigured()).toBe(false);
    expect(manager.isConnected()).toBe(false);

    await expect(manager.connect()).resolves.toBeUndefined();
    expect(manager.isConnected()).toBe(false);
  });

  it('allows deferred configuration and connection', async () => {
    const DatabaseManager = getDatabaseManager();
    const manager = DatabaseManager.getInstance();
    expect(manager.isConfigured()).toBe(false);

    const configured = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
    expect(configured).toBe(manager);
    expect(configured.isConfigured()).toBe(true);

    await configured.connect();
    expect(configured.isConnected()).toBe(true);

    await configured.disconnect();
    expect(configured.isConnected()).toBe(false);
  });
});
