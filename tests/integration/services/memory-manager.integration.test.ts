import { registerServices } from '../../../src/di/registration';
import { MemoryManager } from '../../../src/services/MemoryManager';

describe('MemoryManager Integration', () => {
  beforeAll(() => {
    registerServices();
  });

  it('should initialize and return empty memories when no bot/provider matches', async () => {
    const manager = MemoryManager.getInstance();
    expect(manager).toBeDefined();

    const results = await manager.retrieveRelevantMemories(
      'non-existent-bot',
      'test query',
      'user1'
    );
    expect(results).toHaveLength(0);
  });

  it('should handle missing providers gracefully during retrieval', async () => {
    const manager = MemoryManager.getInstance();
    const provider = await manager.getProviderForBot('non-existent-bot');
    expect(provider).toBeNull();
  });
});
