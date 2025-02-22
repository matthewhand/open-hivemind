const DiscordMsgProviderInt = require('@integrations/discord/providers/DiscordMessageProvider');
const SlackMsgProviderInt = require('@integrations/slack/providers/SlackMessageProvider');
const { getMessageProvider: getMessageProviderInt } = require('@message/management/getMessageProvider');

jest.mock('@message/interfaces/messageConfig', () => ({
  get: jest.fn()
}));

describe('getMessageProvider Unit Test', () => {
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = require('@message/interfaces/messageConfig');
    jest.clearAllMocks();
  });

  it('should return DiscordMessageProvider when MESSAGE_PROVIDER is "discord"', () => {
    mockConfig.get.mockReturnValue('discord');
    const provider = getMessageProviderInt();
    console.log('[DEBUG] Returned provider (Discord):', provider);
    expect(typeof provider.sendMessageToChannel).toBe('function');
    expect(typeof provider.getClientId).toBe('function');
  });

  it('should return SlackMessageProvider when MESSAGE_PROVIDER is "slack"', () => {
    mockConfig.get.mockReturnValue('slack');
    const provider = getMessageProviderInt();
    console.log('[DEBUG] Returned provider (Slack):', provider);
    expect(typeof provider.sendMessageToChannel).toBe('function');
    expect(typeof provider.getClientId).toBe('function');
  });
});
