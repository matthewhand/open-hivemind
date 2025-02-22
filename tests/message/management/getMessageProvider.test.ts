const DiscordMsgProvider = require('@integrations/discord/providers/DiscordMessageProvider');
const SlackMsgProviderTest = require('@integrations/slack/providers/SlackMessageProvider');
const { getMessageProvider: testGetMessageProvider } = require('@message/management/getMessageProvider');

jest.mock('@message/interfaces/messageConfig', () => ({
  get: jest.fn()
}));

describe('getMessageProvider', () => {
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = require('@message/interfaces/messageConfig');
    jest.clearAllMocks();
  });

  it('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "discord"', () => {
    mockConfig.get.mockReturnValue('discord');
    const provider = testGetMessageProvider();
    console.log('[DEBUG] Returned provider (Discord):', provider);
    expect(provider).toBeInstanceOf(DiscordMsgProvider.DiscordMessageProvider);
    expect(provider.sendMessageToChannel).toBeDefined();
    expect(provider.getClientId).toBeDefined();
  });

  it('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "slack"', () => {
    mockConfig.get.mockReturnValue('slack');
    const provider = testGetMessageProvider();
    console.log('[DEBUG] Returned provider (Slack):', provider);
    expect(provider).toBeInstanceOf(SlackMsgProviderTest.SlackMessageProvider);
    expect(provider.sendMessageToChannel).toBeDefined();
    expect(provider.getClientId).toBeDefined();
  });
});
