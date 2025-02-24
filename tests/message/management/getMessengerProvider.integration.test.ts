import { getMessengerProvider } from '@src/message/management/getMessengerProvider';
import messageConfig from '@src/config/messageConfig';

jest.mock('@src/integrations/discord/DiscordService', () => ({
  Discord: {
    DiscordService: {
      getInstance: jest.fn(() => ({
        sendMessageToChannel: jest.fn(),
        getClientId: jest.fn()
      }))
    }
  }
}));

jest.mock('@src/integrations/slack/SlackService', () => {
  return jest.fn(() => ({
    sendMessageToChannel: jest.fn(),
    getClientId: jest.fn()
  }));
});

describe('getMessengerProvider Unit Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return DiscordMessageProvider when MESSAGE_PROVIDER is "discord"', () => {
    messageConfig.set('MESSAGE_PROVIDER', 'discord');
    const provider = getMessengerProvider()[0];
    console.log('[DEBUG] Returned provider (Discord):', provider);
    expect(provider).toBeDefined();
    expect(typeof provider.sendMessageToChannel).toBe('function');
    expect(typeof provider.getClientId).toBe('function');
  });

  it('should return SlackMessageProvider when MESSAGE_PROVIDER is "slack"', () => {
    messageConfig.set('MESSAGE_PROVIDER', 'slack');
    const provider = getMessengerProvider()[0];
    console.log('[DEBUG] Returned provider (Slack):', provider);
    expect(provider).toBeDefined();
    expect(typeof provider.sendMessageToChannel).toBe('function');
    expect(typeof provider.getClientId).toBe('function');
  });
});
