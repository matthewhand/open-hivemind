import { SlackMessageIO } from '@integrations/slack/modules/ISlackMessageIO';

describe('SlackMessageIO send queue and backoff', () => {
  function makeIO(mockPost: jest.Mock) {
    const botInfo = { botUserName: 'Bot', webClient: { chat: { postMessage: mockPost } } };
    const manager = { getAllBots: jest.fn().mockReturnValue([botInfo]) } as any;
    const getMgr = () => manager;
    const getDefault = () => 'Bot';
    const lastMap = new Map<string, string>();
    return new SlackMessageIO(getMgr, getDefault, lastMap);
  }

  it('retries on 429 and eventually succeeds', async () => {
    const err429: any = new Error('ratelimited');
    err429.status = 429;
    err429.data = { retry_after: 0.001 }; // 1ms
    const mockPost = jest
      .fn()
      .mockRejectedValueOnce(err429)
      .mockResolvedValueOnce({ ts: '123.45' });
    const io = makeIO(mockPost);

    const ts = await io.sendMessageToChannel('C1', 'Hello');
    expect(ts).toBe('123.45');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });

  it('serializes multiple sends via queue', async () => {
    const calls: number[] = [];
    const mockPost = jest.fn().mockImplementation(async () => {
      calls.push(Date.now());
      return { ts: String(calls.length) };
    });
    const io = makeIO(mockPost);

    const [a, b] = await Promise.all([
      io.sendMessageToChannel('C1', 'A'),
      io.sendMessageToChannel('C1', 'B'),
    ]);

    expect(a).toBe('1');
    expect(b).toBe('2');
    expect(mockPost).toHaveBeenCalledTimes(2);
  });
});
