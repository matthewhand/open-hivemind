import type { IMessage } from '@hivemind/shared-types';
import { ChatHistory } from '../../src/message/common/chatHistory';

/**
 * Minimal IMessage stub: ChatHistory only reads getTimestamp() and getMessageId().
 */
function stubMessage(id: string, timestampMs: number): IMessage {
  return {
    getMessageId: () => id,
    getTimestamp: () => new Date(timestampMs),
  } as unknown as IMessage;
}

describe('ChatHistory sliding window', () => {
  let history: ChatHistory;

  beforeEach(() => {
    history = ChatHistory.getInstance();
    // ChatHistory is a singleton; clear any state left by other tests.
    history.clearOldMessages(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getRecentMessages returns only messages strictly within the timeframe', () => {
    const now = 1_000_000;
    jest.useFakeTimers().setSystemTime(now);

    history.addMessage(stubMessage('old', now - 10_000));
    history.addMessage(stubMessage('edge', now - 5_000));
    history.addMessage(stubMessage('fresh', now - 1_000));

    const recent = history.getRecentMessages(5_000);
    // threshold = now - 5000; the 'edge' message sits exactly on it => excluded.
    expect(recent.map((m) => m.getMessageId())).toEqual(['fresh']);
  });

  it('getRecentMessages returns all messages when all are within the timeframe', () => {
    const now = 2_000_000;
    jest.useFakeTimers().setSystemTime(now);

    history.addMessage(stubMessage('a', now - 3_000));
    history.addMessage(stubMessage('b', now - 2_000));
    history.addMessage(stubMessage('c', now - 1_000));

    const recent = history.getRecentMessages(10_000);
    expect(recent.map((m) => m.getMessageId())).toEqual(['a', 'b', 'c']);
  });

  it('getRecentMessages returns a defensive copy that cannot mutate internal state', () => {
    const now = 3_000_000;
    jest.useFakeTimers().setSystemTime(now);

    history.addMessage(stubMessage('a', now - 1_000));
    history.addMessage(stubMessage('b', now - 500));

    const recent = history.getRecentMessages(10_000);
    recent.pop();

    // Internal history must be unaffected by mutating the returned array.
    expect(history.getRecentMessages(10_000)).toHaveLength(2);
  });

  it('getRecentMessages returns [] for a non-positive timeframe', () => {
    history.addMessage(stubMessage('a', Date.now()));
    expect(history.getRecentMessages(0)).toEqual([]);
    expect(history.getRecentMessages(-100)).toEqual([]);
  });

  it('clearOldMessages drops messages older than the cutoff (boundary expired)', () => {
    const now = 4_000_000;
    jest.useFakeTimers().setSystemTime(now);

    history.addMessage(stubMessage('old', now - 10_000));
    history.addMessage(stubMessage('edge', now - 5_000));
    history.addMessage(stubMessage('fresh', now - 1_000));

    history.clearOldMessages(5_000);

    // 'old' and 'edge' (exactly on the cutoff) are removed.
    expect(history.getRecentMessages(60_000).map((m) => m.getMessageId())).toEqual(['fresh']);
  });

  it('clearOldMessages keeps everything when nothing is older than the cutoff', () => {
    const now = 5_000_000;
    jest.useFakeTimers().setSystemTime(now);

    history.addMessage(stubMessage('a', now - 1_000));
    history.addMessage(stubMessage('b', now - 500));

    history.clearOldMessages(60_000);
    expect(history.getRecentMessages(60_000)).toHaveLength(2);
  });
});
