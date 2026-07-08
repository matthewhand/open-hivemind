import type { ConversationSummary, MessageRecord } from '@src/database/types';
import {
  ConversationSummaryService,
  type ConversationSummaryStore,
  type Summarizer,
} from '@src/memory/ConversationSummaryService';

function makeMessage(overrides: Partial<MessageRecord> = {}): MessageRecord {
  return {
    messageId: 'm1',
    channelId: 'C1',
    content: 'hello',
    authorId: 'u1',
    authorName: 'Alice',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    provider: 'discord',
    ...overrides,
  };
}

describe('ConversationSummaryService', () => {
  it('summarizes recent messages and persists the result', async () => {
    const stored: ConversationSummary[] = [];
    const messages: MessageRecord[] = [
      // getMessages returns newest-first
      makeMessage({
        content: 'goodbye',
        authorName: 'Bob',
        timestamp: new Date('2026-01-01T00:05:00.000Z'),
        provider: 'slack',
      }),
      makeMessage({
        content: 'hello',
        authorName: 'Alice',
        timestamp: new Date('2026-01-01T00:00:00.000Z'),
        provider: 'discord',
      }),
    ];

    const store: ConversationSummaryStore = {
      getMessages: jest.fn(async () => messages),
      storeConversationSummary: jest.fn(async (s: ConversationSummary) => {
        stored.push(s);
        return 42;
      }),
    };

    const summarizer: Summarizer = jest.fn(async (text: string) => `SUMMARY::${text}`);

    const service = new ConversationSummaryService({ store, summarizer });
    const result = await service.summarizeChannel('C1', { maxMessages: 10, maxWords: 50 });

    expect(result).not.toBeNull();
    expect(result!.id).toBe(42);
    expect(store.getMessages).toHaveBeenCalledWith('C1', 10);

    // Transcript must be chronological (oldest first): Alice then Bob.
    expect(summarizer).toHaveBeenCalledTimes(1);
    const transcriptArg = (summarizer as jest.Mock).mock.calls[0][0] as string;
    expect(transcriptArg).toBe('Alice: hello\nBob: goodbye');
    expect((summarizer as jest.Mock).mock.calls[0][1]).toMatchObject({ maxWords: 50 });

    expect(stored).toHaveLength(1);
    const summary = stored[0];
    expect(summary.channelId).toBe('C1');
    expect(summary.summary).toBe('SUMMARY::Alice: hello\nBob: goodbye');
    expect(summary.messageCount).toBe(2);
    expect(summary.startTimestamp.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(summary.endTimestamp.toISOString()).toBe('2026-01-01T00:05:00.000Z');
    // provider is taken from the latest (chronologically last) message.
    expect(summary.provider).toBe('slack');
  });

  it('returns null and does not persist when there are no messages', async () => {
    const store: ConversationSummaryStore = {
      getMessages: jest.fn(async () => []),
      storeConversationSummary: jest.fn(async () => 1),
    };
    const summarizer: Summarizer = jest.fn(async () => 'unused');

    const service = new ConversationSummaryService({ store, summarizer });
    const result = await service.summarizeChannel('C-empty');

    expect(result).toBeNull();
    expect(summarizer).not.toHaveBeenCalled();
    expect(store.storeConversationSummary).not.toHaveBeenCalled();
  });

  it('falls back to authorId when authorName is missing', async () => {
    const store: ConversationSummaryStore = {
      getMessages: jest.fn(async () => [
        makeMessage({ authorName: '', authorId: 'u-anon', content: 'hi' }),
      ]),
      storeConversationSummary: jest.fn(async () => 7),
    };
    const summarizer: Summarizer = jest.fn(async (text: string) => text);

    const service = new ConversationSummaryService({ store, summarizer });
    await service.summarizeChannel('C1');

    expect((summarizer as jest.Mock).mock.calls[0][0]).toBe('u-anon: hi');
  });

  describe('summarizeTurns (pipeline history summarization)', () => {
    const noopStore: ConversationSummaryStore = {
      getMessages: jest.fn(async () => []),
      storeConversationSummary: jest.fn(async () => 1),
    };

    it('renders an author-attributed transcript and returns the trimmed summary', async () => {
      const summarizer: Summarizer = jest.fn(async () => '  the summary  ');
      const service = new ConversationSummaryService({ store: noopStore, summarizer });

      const result = await service.summarizeTurns(
        [
          { author: 'Alice', text: 'hello' },
          { text: 'system notice' },
          { author: 'Bob', text: 'goodbye' },
        ],
        { maxWords: 80, maxTokensOverride: 250 }
      );

      expect(result).toBe('the summary');
      expect(summarizer).toHaveBeenCalledWith('Alice: hello\nsystem notice\nBob: goodbye', {
        maxWords: 80,
        maxTokensOverride: 250,
      });
      // Pipeline summaries are transient prompt context: nothing is persisted.
      expect(noopStore.storeConversationSummary).not.toHaveBeenCalled();
    });

    it('returns null when every turn is empty', async () => {
      const summarizer: Summarizer = jest.fn();
      const service = new ConversationSummaryService({ store: noopStore, summarizer });

      await expect(service.summarizeTurns([{ text: '' }, { text: '   ' }])).resolves.toBeNull();
      expect(summarizer).not.toHaveBeenCalled();
    });

    it('returns null when the summarizer produces an empty summary', async () => {
      const summarizer: Summarizer = jest.fn(async () => '   ');
      const service = new ConversationSummaryService({ store: noopStore, summarizer });

      await expect(service.summarizeTurns([{ text: 'hello' }])).resolves.toBeNull();
    });

    it('propagates summarizer errors so callers can fall back to raw history', async () => {
      const summarizer: Summarizer = jest.fn(async () => {
        throw new Error('LLM down');
      });
      const service = new ConversationSummaryService({ store: noopStore, summarizer });

      await expect(service.summarizeTurns([{ text: 'hello' }])).rejects.toThrow('LLM down');
    });
  });
});
