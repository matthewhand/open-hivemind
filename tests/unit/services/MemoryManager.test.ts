import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import { MemoryManager } from '@src/services/MemoryManager';
import Logger from '@common/logger';

const addMemoryMock = jest.fn();
const searchMemoriesMock = jest.fn();

jest.mock('@src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: () => ({
      getBot: (name: string) => ({ name, memoryProfile: 'test-profile' }),
    }),
  },
}));

jest.mock('@src/config/memoryProfiles', () => ({
  getMemoryProfileByKey: () => ({ key: 'test-profile', provider: 'test', config: {} }),
}));

jest.mock('@src/plugins', () => ({
  loadPlugin: jest.fn(async () => ({})),
  instantiateMemoryProvider: () => ({
    addMemory: (...args: unknown[]) => addMemoryMock(...args),
    searchMemories: (...args: unknown[]) => searchMemoriesMock(...args),
  }),
}));

jest.mock('@common/logger', () => {
  const logger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { __esModule: true, default: logger, Logger: logger };
});

const recordMetricMock = jest.fn();
jest.mock('@src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn(() => ({ recordMetric: recordMetricMock })),
  },
}));

describe('MemoryManager failure surfacing', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton so warn rate-limiting state does not leak between tests.
    (MemoryManager as unknown as { instance?: MemoryManager }).instance = undefined;
    manager = MemoryManager.getInstance();
  });

  it('warn-logs and records a metric on the first store failure', async () => {
    addMemoryMock.mockRejectedValue(new Error('store boom'));

    await manager.storeConversationMemory('bot-a', 'hello', 'user');

    expect(Logger.warn).toHaveBeenCalledTimes(1);
    expect((Logger.warn as jest.Mock).mock.calls[0][0]).toContain('memory store failed');
    expect((Logger.warn as jest.Mock).mock.calls[0][0]).toContain('bot-a');
    expect(recordMetricMock).toHaveBeenCalledWith('memory_provider_failure', 1, {
      bot: 'bot-a',
      operation: 'store',
    });
  });

  it('rate-limits the warn log to the first failure per bot but keeps counting metrics', async () => {
    addMemoryMock.mockRejectedValue(new Error('store boom'));

    await manager.storeConversationMemory('bot-a', 'one', 'user');
    await manager.storeConversationMemory('bot-a', 'two', 'user');
    await manager.storeConversationMemory('bot-a', 'three', 'assistant');

    expect(Logger.warn).toHaveBeenCalledTimes(1);
    expect(recordMetricMock).toHaveBeenCalledTimes(3);
  });

  it('warns separately for distinct bots', async () => {
    addMemoryMock.mockRejectedValue(new Error('store boom'));

    await manager.storeConversationMemory('bot-a', 'one', 'user');
    await manager.storeConversationMemory('bot-b', 'two', 'user');

    expect(Logger.warn).toHaveBeenCalledTimes(2);
  });

  it('warn-logs retrieve failures and returns an empty array', async () => {
    searchMemoriesMock.mockRejectedValue(new Error('search boom'));

    const results = await manager.retrieveRelevantMemories('bot-a', 'query');

    expect(results).toEqual([]);
    expect(Logger.warn).toHaveBeenCalledTimes(1);
    expect((Logger.warn as jest.Mock).mock.calls[0][0]).toContain('memory retrieve failed');
    expect(recordMetricMock).toHaveBeenCalledWith('memory_provider_failure', 1, {
      bot: 'bot-a',
      operation: 'retrieve',
    });
  });

  it('allows a fresh warn after clearProviderCache()', async () => {
    addMemoryMock.mockRejectedValue(new Error('store boom'));

    await manager.storeConversationMemory('bot-a', 'one', 'user');
    manager.clearProviderCache();
    await manager.storeConversationMemory('bot-a', 'two', 'user');

    expect(Logger.warn).toHaveBeenCalledTimes(2);
  });

  it('does not warn or record metrics on success', async () => {
    addMemoryMock.mockResolvedValue(undefined);
    searchMemoriesMock.mockResolvedValue({ results: [] });

    await manager.storeConversationMemory('bot-a', 'hello', 'user');
    await manager.retrieveRelevantMemories('bot-a', 'query');

    expect(Logger.warn).not.toHaveBeenCalled();
    expect(recordMetricMock).not.toHaveBeenCalled();
  });

  it('still surfaces the warn when the metrics facility throws', async () => {
    addMemoryMock.mockRejectedValue(new Error('store boom'));
    (MetricsCollector.getInstance as jest.Mock).mockImplementationOnce(() => {
      throw new Error('metrics down');
    });

    await expect(manager.storeConversationMemory('bot-a', 'hello', 'user')).resolves.not.toThrow();
    expect(Logger.warn).toHaveBeenCalledTimes(1);
  });
});
