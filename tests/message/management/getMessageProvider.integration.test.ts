const DiscordMsgProviderInt = require('@integrations/discord/providers/DiscordMessageProvider');
const SlackMsgProviderInt = require('@integrations/slack/providers/SlackMessageProvider');
const { getMessageProvider: intGetMessageProvider } = require('@message/management/getMessageProvider');

jest.mock('@message/interfaces/messageConfig', () => ({
  get: jest.fn()
}));

describe('getMessageProvider Unit Test', () => {
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = require('@message/interfaces/messageConfig');
    jest.clearAllMocks();
  });

  it('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "discord"', () => {
    mockConfig.get.mockReturnValue('discord');
    const provider = intGetMessageProvider();
    console.log('[DEBUG] Returned provider (Discord):', provider);
    expect(provider).toBeInstanceOf(DiscordMsgProviderInt.DiscordMessageProvider);
    expect(provider.sendMessageToChannel).toBeDefined();
    expect(provider.getClientId).toBeDefined();
  });

  it('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "slack"', () => {
    mockConfig.get.mockReturnValue('slack');
    const provider = intGetMessageProvider();
    console.log('[DEBUG] Returned provider (Slack):', provider);
    expect(provider).toBeInstanceOf(SlackMsgProviderInt.SlackMessageProvider);
    expect(provider.sendMessageToChannel).toBeDefined();
    expect(provider.getClientId).toBeDefined();
  });
});
