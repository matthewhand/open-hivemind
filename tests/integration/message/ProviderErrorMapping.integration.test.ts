import 'reflect-metadata';
import { SlackMessageIO } from '../../../packages/message-slack/src/modules/ISlackMessageIO';
import { DiscordMessageSender } from '../../../packages/message-discord/src/managers/DiscordMessageSender';
import { MattermostService } from '../../../packages/message-mattermost/src/MattermostService';
import { NetworkError, ValidationError } from '../../../src/types/errorClasses';

describe('Message Provider Error Mapping Integration', () => {
  describe('Slack', () => {
    let mockWebClient: any;
    let service: SlackMessageIO;

    beforeEach(() => {
      mockWebClient = { chat: { postMessage: jest.fn() } };
      const mockBotManager = {
        getAllBots: jest.fn().mockReturnValue([{ botUserName: 'test-bot', webClient: mockWebClient }]),
      };
      service = new SlackMessageIO(() => mockBotManager as any, () => 'test-bot', new Map());
    });

    it('should map channel_not_found to ValidationError', async () => {
      mockWebClient.chat.postMessage.mockRejectedValue({ data: { error: 'channel_not_found' } });
      await expect(service.sendMessageToChannel('C1', 'test')).rejects.toThrow(ValidationError);
    });

    it('should map status 500 to NetworkError', async () => {
      mockWebClient.chat.postMessage.mockRejectedValue({ status: 500 });
      await expect(service.sendMessageToChannel('C1', 'test')).rejects.toThrow(NetworkError);
    });
  });

  describe('Discord', () => {
    let mockClient: any;
    let service: DiscordMessageSender;
    let mockLogger: any;

    beforeEach(() => {
      mockClient = { channels: { fetch: jest.fn() } };
      mockLogger = { error: jest.fn() };
      const mockBotManager = {
        getAllBots: jest.fn().mockReturnValue([{ botUserName: 'test-bot', client: mockClient }]),
      };
      const mockDeps = {
        errorTypes: { ValidationError, NetworkError, ConfigError: Error },
        logger: mockLogger,
      };
      service = new DiscordMessageSender(mockBotManager as any, mockDeps as any);
    });

    it('should map 10003 (Unknown Channel) and log ValidationError', async () => {
      const error = new Error('Unknown Channel');
      (error as any).name = 'DiscordAPIError';
      (error as any).code = 10003;
      mockClient.channels.fetch.mockRejectedValue(error);

      await service.sendMessageToChannel('C1', 'test');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Discord send message validation error:'),
        expect.any(ValidationError)
      );
    });
  });

  describe('Mattermost', () => {
    let mockClient: any;
    let service: MattermostService;

    beforeEach(() => {
      mockClient = { postMessage: jest.fn() };
      service = new MattermostService({} as any, {} as any);
      (service as any).clients.set('test-bot', mockClient);
    });

    it('should map 404 to ValidationError', async () => {
      mockClient.postMessage.mockRejectedValue({ status: 404 });
      await expect(service.sendMessageToChannel('C1', 'test')).rejects.toThrow(ValidationError);
    });

    it('should map 502 to NetworkError', async () => {
      mockClient.postMessage.mockRejectedValue({ status: 502 });
      await expect(service.sendMessageToChannel('C1', 'test')).rejects.toThrow(NetworkError);
    });
  });
});
