import { getMessengerProvider } from '@src/message/management/getMessengerProvider';

jest.mock('@hivemind/adapter-discord', () => ({
  DiscordService: {
    getInstance: jest.fn(() => ({
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
      provider: 'discord',
    })),
  },
}));

jest.mock('@hivemind/adapter-slack/SlackService', () => ({
  SlackService: {
    getInstance: jest.fn(() => ({
      sendMessageToChannel: jest.fn(),
      getClientId: jest.fn(),
      provider: 'slack',
    })),
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() =>
    JSON.stringify({
      providers: [{ type: 'discord' }, { type: 'slack' }],
    })
  ),
}));

describe('getMessengerProvider Unit Test', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return DiscordMessageProvider when MESSAGE_PROVIDER is "discord"', () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    const providers = getMessengerProvider();
    expect(providers).toBeDefined();
    expect(providers.length).toBeGreaterThan(0);
    const provider = providers[0];
    expect(provider).toBeDefined();
    expect(typeof provider.sendMessageToChannel).toBe('function');
    expect(typeof provider.getClientId).toBe('function');
  });

  it('should return SlackMessageProvider when MESSAGE_PROVIDER is "slack"', () => {
    process.env.MESSAGE_PROVIDER = 'slack';
    const providers = getMessengerProvider();
    expect(providers).toBeDefined();
    expect(providers.length).toBeGreaterThan(0);
    const provider = providers[0];
    expect(provider).toBeDefined();
    expect(typeof provider.sendMessageToChannel).toBe('function');
    expect(typeof provider.getClientId).toBe('function');
  });
});
