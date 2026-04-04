import { IdleResponseManager } from '../../../src/message/management/IdleResponseManager';

jest.mock('@message/management/getMessengerProvider', () => ({
  getMessengerProvider: jest.fn(),
}));

jest.mock('@message/helpers/processing/ChannelActivity', () => ({
  recordBotActivity: jest.fn(),
}));

jest.mock('@config/messageConfig', () => ({
  get: jest.fn((key: string) => {
    if (key === 'IDLE_RESPONSE') {
      return {
        enabled: true,
        minDelay: 10,
        maxDelay: 20,
        prompts: ['fallback prompt'],
      };
    }
    return {};
  }),
}));

const { getMessengerProvider } = require('@message/management/getMessengerProvider');

describe('IdleResponseManager', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    delete process.env.IDLE_RESPONSE_MIN_DELAY;
    delete process.env.IDLE_RESPONSE_MAX_DELAY;
    delete process.env.IDLE_RESPONSE_ENABLED;

    // reset singleton between tests
    (IdleResponseManager as any).instance = undefined;
  });

  afterEach(() => {
    try {
      const mgr = IdleResponseManager.getInstance();
      mgr.shutdown();
    } catch {
      // ignore
    }
    jest.useRealTimers();
    process.env = originalEnv;
  });

  function makeService(overrides: any = {}) {
    return {
      providerName: 'discord',
      sendMessageToChannel: jest.fn().mockResolvedValue('msg-id'),
      getMessagesFromChannel: jest.fn().mockResolvedValue([]),
      getClientId: jest.fn().mockReturnValue('bot-1'),
      initialize: jest.fn(),
      sendPublicAnnouncement: jest.fn(),
      getDefaultChannel: jest.fn().mockReturnValue('ch-1'),
      shutdown: jest.fn(),
      setMessageHandler: jest.fn(),
      ...overrides,
    };
  }

  it('initializes delegated services when available', async () => {
    const delegatedService = makeService();
    const hostService = makeService({
      getDelegatedServices: () => [
        {
          serviceName: 'discord-alpha',
          messengerService: delegatedService,
          botConfig: { name: 'Alpha' },
        },
      ],
    });

    getMessengerProvider.mockResolvedValue([hostService]);

    const mgr = IdleResponseManager.getInstance();
    await mgr.initialize();

    const stats = mgr.getStats();
    expect(stats.totalServices).toBe(1);
    expect(stats.serviceDetails[0].serviceName).toBe('discord-alpha');
  });

  it('tracks interactions and creates per-channel state', async () => {
    const service = makeService();
    getMessengerProvider.mockResolvedValue([service]);

    const mgr = IdleResponseManager.getInstance();
    await mgr.initialize();
    mgr.recordInteraction('discord', 'ch-1', 'm-1');

    const stats = mgr.getStats();
    expect(stats.totalServices).toBe(1);
    expect(stats.serviceDetails[0].totalChannels).toBe(1);
    expect(stats.serviceDetails[0].channelDetails[0].interactionCount).toBe(1);
  });

  it('schedules idle response only after second interaction', async () => {
    const service = makeService();
    getMessengerProvider.mockResolvedValue([service]);

    const mgr = IdleResponseManager.getInstance();
    await mgr.initialize();

    mgr.recordInteraction('discord', 'ch-1', 'm-1');
    let stats = mgr.getStats();
    expect(stats.serviceDetails[0].channelDetails[0].hasTimer).toBe(false);

    mgr.recordInteraction('discord', 'ch-1', 'm-2');
    stats = mgr.getStats();
    expect(stats.serviceDetails[0].channelDetails[0].hasTimer).toBe(true);
  });

  it('uses fallback prompt and sends idle response when timer fires', async () => {
    const service = makeService({
      getMessagesFromChannel: jest.fn().mockResolvedValue([]),
    });
    getMessengerProvider.mockResolvedValue([service]);

    const mgr = IdleResponseManager.getInstance();
    mgr.configure({ minDelay: 10, maxDelay: 10, prompts: ['hello idle'] });
    await mgr.initialize();

    mgr.recordInteraction('discord', 'ch-1', 'm-1');
    mgr.recordInteraction('discord', 'ch-1', 'm-2');

    await jest.advanceTimersByTimeAsync(15);

    expect(service.sendMessageToChannel).toHaveBeenCalledWith('ch-1', 'hello idle', 'Assistant');
  });

  it('clearChannel removes channel and lastInteractedChannelId', async () => {
    const service = makeService();
    getMessengerProvider.mockResolvedValue([service]);

    const mgr = IdleResponseManager.getInstance();
    await mgr.initialize();

    mgr.recordInteraction('discord', 'ch-1', 'm-1');
    mgr.clearChannel('discord', 'ch-1');

    const stats = mgr.getStats();
    expect(stats.serviceDetails[0].totalChannels).toBe(0);
    expect(stats.serviceDetails[0].lastInteractedChannel).toBeNull();
  });

  it('shutdown clears all state and disables manager', async () => {
    const service = makeService();
    getMessengerProvider.mockResolvedValue([service]);

    const mgr = IdleResponseManager.getInstance();
    await mgr.initialize();
    mgr.recordInteraction('discord', 'ch-1', 'm-1');

    mgr.shutdown();

    const stats = mgr.getStats();
    expect(stats.totalServices).toBe(0);
  });

  it('applies env-based enabled=false override', async () => {
    process.env.IDLE_RESPONSE_ENABLED = 'false';
    const service = makeService();
    getMessengerProvider.mockResolvedValue([service]);

    const mgr = IdleResponseManager.getInstance();
    await mgr.initialize();

    // Since disabled, no services should be initialized
    const stats = mgr.getStats();
    expect(stats.totalServices).toBe(0);
  });
});
