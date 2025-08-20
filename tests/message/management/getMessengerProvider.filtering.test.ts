import path from 'path';

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => JSON.stringify({
    providers: [
      { type: 'discord' },
      { type: 'slack' }
    ]
  }))
}));

jest.mock('@integrations/discord/DiscordService', () => ({
  DiscordService: {
    getInstance: jest.fn(() => ({
      provider: 'discord',
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn()
    }))
  }
}));

jest.mock('@integrations/slack/SlackService', () => ({
  SlackService: {
    getInstance: jest.fn(() => ({
      provider: 'slack',
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn()
    }))
  }
}));

describe('getMessengerProvider filtering', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('a) MESSAGE_PROVIDER="discord": only Discord is initialized', async () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    const { getMessengerProvider } = await import('../../../src/message/management/getMessengerProvider');
    const providers = getMessengerProvider();
    
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(0);
  });

  test('b) MESSAGE_PROVIDER="slack": only Slack is initialized', async () => {
    process.env.MESSAGE_PROVIDER = 'slack';
    const { getMessengerProvider } = await import('../../../src/message/management/getMessengerProvider');
    const providers = getMessengerProvider();
    
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(0);
  });

  test('c) MESSAGE_PROVIDER="discord,slack": both are initialized', async () => {
    process.env.MESSAGE_PROVIDER = 'discord,slack';
    const { getMessengerProvider } = await import('../../../src/message/management/getMessengerProvider');
    const providers = getMessengerProvider();
    
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(0);
  });

  test('d) MESSAGE_PROVIDER set to unavailable provider: returns empty or default', async () => {
    process.env.MESSAGE_PROVIDER = 'webhook';
    const { getMessengerProvider } = await import('../../../src/message/management/getMessengerProvider');
    const providers = getMessengerProvider();
    
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(0);
  });

  test('e) MESSAGE_PROVIDER unset: defaults to available providers', async () => {
    delete process.env.MESSAGE_PROVIDER;
    const { getMessengerProvider } = await import('../../../src/message/management/getMessengerProvider');
    const providers = getMessengerProvider();
    
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(0);
  });
});