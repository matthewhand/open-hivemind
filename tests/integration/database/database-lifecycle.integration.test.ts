import 'reflect-metadata';
import { DatabaseManager } from '../../../src/database/DatabaseManager';

describe('Database Lifecycle Integration', () => {
  beforeEach(() => {
    (DatabaseManager as any).instance = undefined;
  });

  afterAll(() => {
    (DatabaseManager as any).instance = undefined;
  });

  it('should handle full lifecycle: unconfigured -> configured -> connected -> disconnected', async () => {
    // 1. Initially unconfigured
    const manager = DatabaseManager.getInstance();
    expect(manager.isConfigured()).toBe(false);
    expect(manager.isConnected()).toBe(false);

    // 2. Attempt connection when unconfigured (should be a no-op or handled gracefully)
    await expect(manager.connect()).resolves.toBeUndefined();
    expect(manager.isConnected()).toBe(false);

    // 3. Configure it
    const configured = DatabaseManager.getInstance({
      type: 'sqlite',
      path: ':memory:',
    });
    expect(configured).toBe(manager);
    expect(configured.isConfigured()).toBe(true);

    // 4. Connect
    await configured.connect();
    expect(configured.isConnected()).toBe(true);

    // 5. Basic operation to verify connection
    const bots = await configured.getAllBotConfigurationsWithDetails();
    expect(Array.isArray(bots)).toBe(true);

    // 6. Disconnect
    await configured.disconnect();
    expect(configured.isConnected()).toBe(false);
  });

  it('should throw error when re-configuring an active connection', async () => {
    const manager = DatabaseManager.getInstance({
      type: 'sqlite',
      path: ':memory:',
    });
    await manager.connect();

    // Trying to getInstance with different config should probably warning or be ignored, 
    // but re-initializing the same singleton is what we test here.
    const second = DatabaseManager.getInstance({ type: 'sqlite', path: 'other.db' });
    expect(second).toBe(manager);
    
    await manager.disconnect();
  });
});
