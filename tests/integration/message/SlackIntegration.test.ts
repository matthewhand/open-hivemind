import 'reflect-metadata';
import { SlackMessageIO } from '../../../packages/message-slack/src/modules/ISlackMessageIO';

describe('SlackMessageIO Integration', () => {
  let mockWebClient: any;
  let service: SlackMessageIO;

  beforeEach(() => {
    mockWebClient = {
      chat: {
        postMessage: jest.fn()
      }
    };
    
    const mockBotManager = {
      getAllBots: jest.fn().mockReturnValue([{ 
        botUserName: 'test-bot', 
        webClient: mockWebClient 
      }]),
    };
    
    service = new SlackMessageIO(
      () => mockBotManager as any,
      () => 'test-bot',
      new Map()
    );
  });

  it('should handle rate limiting (429) by retrying', async () => {
    const err429: any = new Error('ratelimited');
    err429.status = 429;
    err429.data = { retry_after: 0.01 }; // 10ms
    
    mockWebClient.chat.postMessage
      .mockRejectedValueOnce(err429)
      .mockResolvedValueOnce({ ts: '123.45' });

    const start = Date.now();
    const result = await service.sendMessageToChannel('C1', 'Hello');
    const duration = Date.now() - start;

    expect(result).toBe('123.45');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledTimes(2);
    expect(duration).toBeGreaterThanOrEqual(10);
  });

  it('should queue multiple messages and send them sequentially', async () => {
    let activeCalls = 0;
    let maxConcurrent = 0;
    
    mockWebClient.chat.postMessage.mockImplementation(async () => {
      activeCalls++;
      maxConcurrent = Math.max(maxConcurrent, activeCalls);
      await new Promise(resolve => setTimeout(resolve, 50));
      activeCalls--;
      return { ts: 'ok' };
    });

    await Promise.all([
      service.sendMessageToChannel('C1', 'Msg 1'),
      service.sendMessageToChannel('C1', 'Msg 2'),
      service.sendMessageToChannel('C1', 'Msg 3')
    ]);

    expect(mockWebClient.chat.postMessage).toHaveBeenCalledTimes(3);
    // Queue should ensure they run one by one
    expect(maxConcurrent).toBe(1);
  });
});
