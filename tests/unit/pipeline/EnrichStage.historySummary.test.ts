/**
 * EnrichStage history summarization tests.
 *
 * Covers the config-gated compression of older history turns into an
 * LLM-generated summary: threshold behavior, fallback on summarizer failure
 * or empty output, default-off configuration, and the NODE_ENV=test guard.
 */

import { IMessage } from '@hivemind/shared-types';
import type { MessageBus } from '@src/events/MessageBus';
import type { MessageContext, ReplyDecision } from '@src/events/types';
import {
  defaultHistorySummaryConfig,
  EnrichStage,
  type HistorySummarizer,
  type HistorySummaryConfig,
  type MemoryRetriever,
  type PromptBuilder,
} from '@src/pipeline/EnrichStage';

class StubMessage extends IMessage {
  private id: string;
  private text: string;
  private author: string;

  constructor(text: string, id = 'msg-1', author = 'Alice') {
    super({}, 'user');
    this.id = id;
    this.text = text;
    this.author = author;
    this.content = text;
    this.channelId = 'ch-1';
    this.platform = 'test';
  }

  getMessageId(): string {
    return this.id;
  }
  getText(): string {
    return this.text;
  }
  getTimestamp(): Date {
    return new Date();
  }
  setText(t: string): void {
    this.text = t;
  }
  getChannelId(): string {
    return this.channelId;
  }
  getAuthorId(): string {
    return 'user-1';
  }
  getChannelTopic(): string | null {
    return null;
  }
  getUserMentions(): string[] {
    return [];
  }
  getChannelUsers(): string[] {
    return [];
  }
  mentionsUsers(_userId: string): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return this.author;
  }
}

function makeHistory(count: number): IMessage[] {
  return Array.from({ length: count }, (_, i) => new StubMessage(`turn ${i}`, `msg-${i}`));
}

function makeBus(): { bus: MessageBus; emitted: Array<{ event: string; payload: any }> } {
  const emitted: Array<{ event: string; payload: any }> = [];
  const bus = {
    on: jest.fn(),
    emitAsync: jest.fn(async (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    }),
  } as unknown as MessageBus;
  return { bus, emitted };
}

function makeCtx(historyLength: number): MessageContext & { decision: ReplyDecision } {
  return {
    message: new StubMessage('current question', 'msg-current'),
    history: makeHistory(historyLength),
    botConfig: { name: 'TestBot' },
    botName: 'TestBot',
    platform: 'test',
    channelId: 'ch-1',
    metadata: {},
    decision: { shouldReply: true, reason: 'test' },
  };
}

const memoryRetriever: MemoryRetriever = {
  retrieveMemories: jest.fn(async () => [] as string[]),
};

const promptBuilder: PromptBuilder = {
  buildSystemPrompt: jest.fn(() => 'BASE PROMPT'),
};

const enabledConfig =
  (overrides: Partial<HistorySummaryConfig> = {}): (() => HistorySummaryConfig) =>
  () => ({ enabled: true, threshold: 5, keepRecent: 3, maxWords: 100, ...overrides });

describe('EnrichStage history summarization', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.MESSAGE_HISTORY_SUMMARY_ENABLED;
  });

  it('summarizes older turns above the threshold and keeps recent turns verbatim', async () => {
    const { bus, emitted } = makeBus();
    const summarizer: HistorySummarizer = {
      summarizeHistory: jest.fn(async () => 'They argued about tabs vs spaces.'),
    };
    const stage = new EnrichStage(bus, memoryRetriever, promptBuilder, summarizer, enabledConfig());

    const ctx = makeCtx(10);
    await stage.process(ctx);

    // Summarizer received only the older turns (10 - keepRecent(3) = 7).
    expect(summarizer.summarizeHistory).toHaveBeenCalledTimes(1);
    const [olderTurns, botConfig, options] = (summarizer.summarizeHistory as jest.Mock).mock
      .calls[0];
    expect(olderTurns).toHaveLength(7);
    expect(olderTurns[0].getText()).toBe('turn 0');
    expect(olderTurns[6].getText()).toBe('turn 6');
    expect(botConfig).toEqual({ name: 'TestBot' });
    expect(options).toEqual({ maxWords: 100 });

    // Enriched event carries trimmed history + summary-prefixed prompt.
    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('message:enriched');
    const payload = emitted[0].payload;
    expect(payload.history).toHaveLength(3);
    expect(payload.history[0].getText()).toBe('turn 7');
    expect(payload.systemPrompt).toBe(
      'Summary of earlier conversation:\nThey argued about tabs vs spaces.\n\nBASE PROMPT'
    );
    expect(payload.metadata.enrich.historySummarized).toBe(true);
    expect(payload.metadata.enrich.summarizedTurns).toBe(7);
    expect(payload.metadata.enrich.retainedTurns).toBe(3);
  });

  it('does not summarize when history is at or below the threshold', async () => {
    const { bus, emitted } = makeBus();
    const summarizer: HistorySummarizer = { summarizeHistory: jest.fn() };
    const stage = new EnrichStage(bus, memoryRetriever, promptBuilder, summarizer, enabledConfig());

    const ctx = makeCtx(5); // threshold is 5; only strictly-greater triggers
    await stage.process(ctx);

    expect(summarizer.summarizeHistory).not.toHaveBeenCalled();
    expect(emitted[0].payload.history).toHaveLength(5);
    expect(emitted[0].payload.systemPrompt).toBe('BASE PROMPT');
    expect(emitted[0].payload.metadata.enrich.historySummarized).toBe(false);
  });

  it('falls back to the full, unmodified history when the summarizer throws', async () => {
    const { bus, emitted } = makeBus();
    const summarizer: HistorySummarizer = {
      summarizeHistory: jest.fn(async () => {
        throw new Error('LLM unavailable');
      }),
    };
    const stage = new EnrichStage(bus, memoryRetriever, promptBuilder, summarizer, enabledConfig());

    const ctx = makeCtx(10);
    await stage.process(ctx);

    expect(emitted).toHaveLength(1);
    expect(emitted[0].event).toBe('message:enriched');
    expect(emitted[0].payload.history).toHaveLength(10);
    expect(emitted[0].payload.systemPrompt).toBe('BASE PROMPT');
    expect(emitted[0].payload.metadata.enrich.historySummarized).toBe(false);
  });

  it('falls back when the summarizer returns an empty summary', async () => {
    const { bus, emitted } = makeBus();
    const summarizer: HistorySummarizer = {
      summarizeHistory: jest.fn(async () => '   '),
    };
    const stage = new EnrichStage(bus, memoryRetriever, promptBuilder, summarizer, enabledConfig());

    await stage.process(makeCtx(10));

    expect(emitted[0].payload.history).toHaveLength(10);
    expect(emitted[0].payload.systemPrompt).toBe('BASE PROMPT');
  });

  it('skips summarization when disabled by config', async () => {
    const { bus, emitted } = makeBus();
    const summarizer: HistorySummarizer = { summarizeHistory: jest.fn() };
    const stage = new EnrichStage(
      bus,
      memoryRetriever,
      promptBuilder,
      summarizer,
      enabledConfig({ enabled: false })
    );

    await stage.process(makeCtx(50));

    expect(summarizer.summarizeHistory).not.toHaveBeenCalled();
    expect(emitted[0].payload.history).toHaveLength(50);
  });

  it('skips summarization when no summarizer is wired (legacy constructor shape)', async () => {
    const { bus, emitted } = makeBus();
    const stage = new EnrichStage(bus, memoryRetriever, promptBuilder);

    await stage.process(makeCtx(50));

    expect(emitted[0].payload.history).toHaveLength(50);
    expect(emitted[0].payload.systemPrompt).toBe('BASE PROMPT');
  });

  describe('defaultHistorySummaryConfig', () => {
    it('is disabled under NODE_ENV=test unless explicitly enabled via env', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(defaultHistorySummaryConfig().enabled).toBe(false);

      process.env.MESSAGE_HISTORY_SUMMARY_ENABLED = 'true';
      expect(defaultHistorySummaryConfig().enabled).toBe(true);
    });

    it('uses conservative defaults for threshold and retention', () => {
      const config = defaultHistorySummaryConfig();
      expect(config.threshold).toBeGreaterThanOrEqual(1);
      expect(config.keepRecent).toBeGreaterThanOrEqual(1);
      expect(config.maxWords).toBeGreaterThanOrEqual(10);
    });
  });
});
