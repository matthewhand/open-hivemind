import { SlackMessageIO } from '../../../packages/message-slack/src/modules/ISlackMessageIO';
import { NetworkError, ValidationError } from '../../../src/types/errorClasses';

describe('SlackMessageIO Error Mapping', () => {
  let mockWebClient: any;
  let mockBotManager: any;
  let slackMessageIO: any;

  beforeEach(() => {
    mockWebClient = {
      chat: {
        postMessage: jest.fn(),
      }
    };

    mockBotManager = {
      getAllBots: jest.fn().mockReturnValue([{ botUserName: 'test-bot', webClient: mockWebClient }])
    };

    slackMessageIO = new SlackMessageIO(
      () => mockBotManager,
      () => 'test-bot',
      new Map()
    );
  });

  it('should map channel_not_found to ValidationError', async () => {
    mockWebClient.chat.postMessage.mockRejectedValue({ data: { error: 'channel_not_found' } });

    await expect(slackMessageIO.sendMessageToChannel('C123', 'test')).rejects.toThrow(ValidationError);
  });

  it('should map 500 error to NetworkError', async () => {
    mockWebClient.chat.postMessage.mockRejectedValue({ status: 500 });

    await expect(slackMessageIO.sendMessageToChannel('C123', 'test')).rejects.toThrow(NetworkError);
  });
});
