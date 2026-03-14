import { DiscordMessageSender } from '../../../packages/message-discord/src/managers/DiscordMessageSender';
import { NetworkError, ValidationError } from '../../../src/types/errorClasses';

describe('DiscordMessageSender Error Mapping', () => {
  let mockClient: any;
  let mockBotManager: any;
  let discordMessageSender: any;
  let mockDeps: any;

  beforeEach(() => {
    mockClient = {
      channels: {
        fetch: jest.fn(),
      }
    };

    mockBotManager = {
      getAllBots: jest.fn().mockReturnValue([{ botUserName: 'test-bot', client: mockClient }])
    };

    mockDeps = {
      errorTypes: { ConfigError: Error, ValidationError, NetworkError },
      logger: { error: jest.fn() }
    };

    discordMessageSender = new DiscordMessageSender(mockBotManager, mockDeps as any);
  });

  it('should map 10003 (Unknown Channel) to ValidationError', async () => {
    const error = new Error('Unknown Channel');
    error.name = 'DiscordAPIError';
    (error as any).code = 10003;
    mockClient.channels.fetch.mockRejectedValue(error);

    await discordMessageSender.sendMessageToChannel('C123', 'test');
    expect(mockDeps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Discord send message validation error:'),
      expect.any(ValidationError)
    );
  });
});
