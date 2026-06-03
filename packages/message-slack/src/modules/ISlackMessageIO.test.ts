import { SlackMessageIO } from './ISlackMessageIO';

/**
 * Builds a SlackMessageIO wired to a single fake bot whose webClient is the
 * supplied mock. Mirrors how SlackService constructs the IO module.
 */
function buildIO(botInfo: any) {
  const botManager: any = {
    getAllBots: () => (botInfo ? [botInfo] : []),
  };
  return new SlackMessageIO(
    () => botManager,
    () => 'TestBot',
    new Map<string, string>()
  );
}

describe('SlackMessageIO.sendNativeTypingStatus', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.clearAllMocks();
  });

  it('calls assistant.threads.setStatus and returns true when available', async () => {
    const setStatus = jest.fn().mockResolvedValue({ ok: true });
    const botInfo = {
      botUserName: 'TestBot',
      webClient: { assistant: { threads: { setStatus } } },
    };
    const io = buildIO(botInfo);

    const result = await io.sendNativeTypingStatus!('C123', '1700000000.0001', 'TestBot');

    expect(result).toBe(true);
    expect(setStatus).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith({
      channel_id: 'C123',
      thread_ts: '1700000000.0001',
      status: 'is typing...',
    });
  });

  it('honors SLACK_TYPING_STATUS_TEXT override', async () => {
    process.env.SLACK_TYPING_STATUS_TEXT = 'thinking…';
    const setStatus = jest.fn().mockResolvedValue({ ok: true });
    const botInfo = {
      botUserName: 'TestBot',
      webClient: { assistant: { threads: { setStatus } } },
    };
    const io = buildIO(botInfo);

    await io.sendNativeTypingStatus!('C123', '1700000000.0001');

    expect(setStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'thinking…' })
    );
  });

  it('returns false without a thread (assistant status is thread-scoped)', async () => {
    const setStatus = jest.fn();
    const botInfo = {
      botUserName: 'TestBot',
      webClient: { assistant: { threads: { setStatus } } },
    };
    const io = buildIO(botInfo);

    const result = await io.sendNativeTypingStatus!('C123', undefined, 'TestBot');

    expect(result).toBe(false);
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('returns false when the assistant API is not available on the client', async () => {
    const botInfo = { botUserName: 'TestBot', webClient: {} };
    const io = buildIO(botInfo);

    const result = await io.sendNativeTypingStatus!('C123', '1700000000.0001', 'TestBot');

    expect(result).toBe(false);
  });

  it('returns false (no throw) when setStatus rejects, enabling fallback', async () => {
    const setStatus = jest.fn().mockRejectedValue(new Error('missing_scope'));
    const botInfo = {
      botUserName: 'TestBot',
      webClient: { assistant: { threads: { setStatus } } },
    };
    const io = buildIO(botInfo);

    const result = await io.sendNativeTypingStatus!('C123', '1700000000.0001', 'TestBot');

    expect(result).toBe(false);
  });
});
