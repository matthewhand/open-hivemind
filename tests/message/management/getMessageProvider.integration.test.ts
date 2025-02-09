import { getMessageProvider } from '@message/management/getMessageProvider';

jest.mock('@src/message/interfaces/messageConfig', () => ({
  get: (key: string) => {
    const testConfig: Record<string, string> = {
      MESSAGE_PROVIDER: process.env.MESSAGE_PROVIDER || 'discord',
    };
    return testConfig[key];
  },
}));

describe('getMessageProvider Unit Test', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.MESSAGE_PROVIDER;
  });

  test('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "discord"', () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    const provider = getMessageProvider();

    console.log('[DEBUG] Returned provider (Discord):', provider);

    expect(provider).toHaveProperty('sendMessageToChannel');
  });

  test('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "slack"', () => {
    process.env.MESSAGE_PROVIDER = 'slack';
    const provider = getMessageProvider();

    console.log('[DEBUG] Returned provider (Slack):', provider);

    expect(provider).toHaveProperty('sendMessageToChannel');
  });
});
