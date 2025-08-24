import { DatabaseManager } from '@src/database/DatabaseManager';

describe('DatabaseManager', () => {
  let manager: DatabaseManager;

  beforeEach(() => {
    manager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
  });

  test('should connect to database', async () => {
    await manager.connect();
    expect(manager.isConnected()).toBe(true);
  });

  test('should disconnect from database', async () => {
    await manager.connect();
    await manager.disconnect();
    expect(manager.isConnected()).toBe(false);
  });

  test('should return empty message history initially', async () => {
    const history = await manager.getMessageHistory('test-channel');
    expect(history).toEqual([]);
  });
});