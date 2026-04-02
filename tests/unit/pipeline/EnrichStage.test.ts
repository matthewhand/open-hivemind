/**
 * Tests for EnrichStage -- Pipeline Stage 3.
 *
 * EnrichStage listens for `message:accepted` events on the MessageBus,
 * retrieves memories via an injectable MemoryRetriever, builds a system
 * prompt via an injectable PromptBuilder, and emits `message:enriched`.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext, ReplyDecision } from '@src/events/types';
import { EnrichStage } from '@src/pipeline/EnrichStage';
import type { MemoryRetriever, PromptBuilder } from '@src/pipeline/EnrichStage';
import { IMessage } from '@message/interfaces/IMessage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal concrete IMessage stub for tests. */
class StubMessage extends IMessage {
  private id: string;
  private text: string;
  private timestamp: Date;

  constructor(text = 'hello', id = 'msg-1') {
    super({}, 'user');
    this.id = id;
    this.text = text;
    this.content = text;
    this.channelId = 'ch-1';
    this.platform = 'test';
    this.timestamp = new Date();
  }

  getMessageId(): string { return this.id; }
  getText(): string { return this.text; }
  getTimestamp(): Date { return this.timestamp; }
  setText(t: string): void { this.text = t; this.content = t; }
  getChannelId(): string { return this.channelId; }
  getAuthorId(): string { return 'user-1'; }
  getChannelTopic(): string | null { return null; }
  getUserMentions(): string[] { return []; }
  getChannelUsers(): string[] { return ['user-1']; }
  mentionsUsers(_userId: string): boolean { return false; }
  isFromBot(): boolean { return false; }
  getAuthorName(): string { return 'TestUser'; }
}

const defaultDecision: ReplyDecision = { shouldReply: true, reason: 'mentioned' };

function makeAcceptedCtx(
  overrides: Partial<MessageContext> = {},
  decision: ReplyDecision = defaultDecision,
): MessageContext & { decision: ReplyDecision } {
  return {
    message: new StubMessage(),
    history: [],
    botConfig: {},
    botName: 'TestBot',
    platform: 'test',
    channelId: 'ch-1',
    metadata: {},
    ...overrides,
    decision,
  };
}

function mockRetriever(memories: string[] = []): MemoryRetriever {
  return {
    retrieveMemories: jest.fn().mockResolvedValue(memories),
  };
}

function mockPromptBuilder(prompt = 'You are TestBot.'): PromptBuilder {
  return {
    buildSystemPrompt: jest.fn().mockReturnValue(prompt),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EnrichStage', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  // ---- 1. Valid enrichment -- retrieves memories and builds prompt ----
  describe('valid enrichment', () => {
    it('retrieves memories and builds a system prompt', async () => {
      const retriever = mockRetriever(['mem1', 'mem2']);
      const builder = mockPromptBuilder('You are a helpful bot.');
      const stage = new EnrichStage(bus, retriever, builder);
      const ctx = makeAcceptedCtx();

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(ctx);

      expect(enriched).toHaveBeenCalledTimes(1);
      expect(enriched).toHaveBeenCalledWith(
        expect.objectContaining({
          memories: ['mem1', 'mem2'],
          systemPrompt: 'You are a helpful bot.',
          botName: 'TestBot',
        }),
      );
    });
  });

  // ---- 2. Empty memories -- works with no memories returned ----
  describe('empty memories', () => {
    it('works when retriever returns an empty array', async () => {
      const retriever = mockRetriever([]);
      const builder = mockPromptBuilder('prompt');
      const stage = new EnrichStage(bus, retriever, builder);

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(makeAcceptedCtx());

      expect(enriched).toHaveBeenCalledTimes(1);
      expect(enriched.mock.calls[0][0].memories).toEqual([]);
    });
  });

  // ---- 3. Memory error -- emits enriched with empty memories (graceful) ----
  describe('memory retrieval error', () => {
    it('uses empty memories when retriever throws', async () => {
      const retriever: MemoryRetriever = {
        retrieveMemories: jest.fn().mockRejectedValue(new Error('db down')),
      };
      const builder = mockPromptBuilder('prompt');
      const stage = new EnrichStage(bus, retriever, builder);

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(makeAcceptedCtx());

      expect(enriched).toHaveBeenCalledTimes(1);
      expect(enriched.mock.calls[0][0].memories).toEqual([]);
      expect(enriched.mock.calls[0][0].systemPrompt).toBe('prompt');
    });
  });

  // ---- 4. Prompt builder receives correct args ----
  describe('prompt builder receives correct args', () => {
    it('passes botConfig, memories, and botName to buildSystemPrompt', async () => {
      const retriever = mockRetriever(['m1', 'm2']);
      const builder = mockPromptBuilder('result');
      const stage = new EnrichStage(bus, retriever, builder);
      const botConfig = { BOT_NAME: 'MyBot', personality: 'friendly' };
      const ctx = makeAcceptedCtx({ botConfig, botName: 'MyBot' });

      await stage.process(ctx);

      expect(builder.buildSystemPrompt).toHaveBeenCalledTimes(1);
      expect(builder.buildSystemPrompt).toHaveBeenCalledWith(
        botConfig,
        ['m1', 'm2'],
        'MyBot',
      );
    });
  });

  // ---- 5. register() hooks to message:accepted ----
  describe('register()', () => {
    it('adds a listener for message:accepted on the bus', () => {
      const stage = new EnrichStage(bus, mockRetriever(), mockPromptBuilder());

      expect(bus.listenerCount('message:accepted')).toBe(0);

      stage.register();

      expect(bus.listenerCount('message:accepted')).toBe(1);
    });
  });

  // ---- 6. Integration -- accepted event flows to enriched ----
  describe('register() integration', () => {
    it('processes a message:accepted event end-to-end', async () => {
      const retriever = mockRetriever(['memory']);
      const builder = mockPromptBuilder('sys prompt');
      const stage = new EnrichStage(bus, retriever, builder);
      stage.register();

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      const ctx = makeAcceptedCtx();
      await bus.emitAsync('message:accepted', ctx);

      expect(retriever.retrieveMemories).toHaveBeenCalledTimes(1);
      expect(enriched).toHaveBeenCalledTimes(1);
      expect(enriched).toHaveBeenCalledWith(
        expect.objectContaining({
          memories: ['memory'],
          systemPrompt: 'sys prompt',
        }),
      );
    });
  });

  // ---- 7. Error in prompt builder -- emits message:error ----
  describe('prompt builder error', () => {
    it('emits message:error with stage="enrich" when builder throws', async () => {
      const retriever = mockRetriever(['mem']);
      const builder: PromptBuilder = {
        buildSystemPrompt: jest.fn().mockImplementation(() => {
          throw new Error('template broken');
        }),
      };
      const stage = new EnrichStage(bus, retriever, builder);

      const errorListener = jest.fn();
      const enriched = jest.fn();
      bus.on('message:error', errorListener);
      bus.on('message:enriched', enriched);

      await stage.process(makeAcceptedCtx());

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          stage: 'enrich',
        }),
      );
      expect(errorListener.mock.calls[0][0].error.message).toBe('template broken');
      expect(enriched).not.toHaveBeenCalled();
    });
  });

  // ---- 8. Memory timeout -- uses empty memories after timeout ----
  describe('memory timeout', () => {
    it('uses empty memories when retrieval exceeds 5s timeout', async () => {
      jest.useFakeTimers();

      const retriever: MemoryRetriever = {
        retrieveMemories: jest.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(['late']), 10_000)),
        ),
      };
      const builder = mockPromptBuilder('prompt');
      const stage = new EnrichStage(bus, retriever, builder);

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      const processPromise = stage.process(makeAcceptedCtx());

      // Advance past the 5s timeout but before the 10s retrieval completes
      jest.advanceTimersByTime(5_001);

      await processPromise;

      expect(enriched).toHaveBeenCalledTimes(1);
      expect(enriched.mock.calls[0][0].memories).toEqual([]);

      jest.useRealTimers();
    });
  });

  // ---- 9. Passes decision through to enriched context ----
  describe('passes decision through', () => {
    it('includes the original decision in the enriched payload', async () => {
      const decision: ReplyDecision = {
        shouldReply: true,
        reason: 'direct mention',
        meta: { confidence: 0.9 },
      };
      const stage = new EnrichStage(bus, mockRetriever(['m']), mockPromptBuilder('p'));

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(makeAcceptedCtx({}, decision));

      const payload = enriched.mock.calls[0][0];
      expect(payload.decision).toEqual(decision);
    });
  });

  // ---- 10. Multiple messages processed independently ----
  describe('multiple messages processed independently', () => {
    it('processes each message with its own context', async () => {
      let callCount = 0;
      const retriever: MemoryRetriever = {
        retrieveMemories: jest.fn().mockImplementation(async () => {
          callCount++;
          return [`mem-${callCount}`];
        }),
      };
      const builder: PromptBuilder = {
        buildSystemPrompt: jest.fn().mockImplementation(
          (_cfg: Record<string, unknown>, mems: string[], name: string) => `prompt for ${name} with ${mems.join(',')}`,
        ),
      };
      const stage = new EnrichStage(bus, retriever, builder);

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(makeAcceptedCtx({ botName: 'Bot1' }));
      await stage.process(makeAcceptedCtx({ botName: 'Bot2' }));

      expect(retriever.retrieveMemories).toHaveBeenCalledTimes(2);
      expect(enriched).toHaveBeenCalledTimes(2);

      expect(enriched.mock.calls[0][0].botName).toBe('Bot1');
      expect(enriched.mock.calls[0][0].memories).toEqual(['mem-1']);

      expect(enriched.mock.calls[1][0].botName).toBe('Bot2');
      expect(enriched.mock.calls[1][0].memories).toEqual(['mem-2']);
    });
  });

  // ---- 11. Retriever called with correct arguments ----
  describe('retriever called with correct arguments', () => {
    it('calls retrieveMemories with botName, message text, and limit 5', async () => {
      const retriever = mockRetriever([]);
      const builder = mockPromptBuilder('p');
      const stage = new EnrichStage(bus, retriever, builder);
      const msg = new StubMessage('What is the meaning of life?', 'msg-42');
      const ctx = makeAcceptedCtx({ message: msg, botName: 'PhiloBot' });

      await stage.process(ctx);

      expect(retriever.retrieveMemories).toHaveBeenCalledWith(
        'PhiloBot',
        'What is the meaning of life?',
        5,
      );
    });
  });

  // ---- 12. Non-Error throw in prompt builder ----
  describe('non-Error throw in prompt builder', () => {
    it('wraps non-Error throws into Error objects', async () => {
      const builder: PromptBuilder = {
        buildSystemPrompt: jest.fn().mockImplementation(() => {
          throw 'string error';
        }),
      };
      const stage = new EnrichStage(bus, mockRetriever(), builder);

      const errorListener = jest.fn();
      bus.on('message:error', errorListener);

      await stage.process(makeAcceptedCtx());

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener.mock.calls[0][0].error).toBeInstanceOf(Error);
      expect(errorListener.mock.calls[0][0].error.message).toBe('string error');
    });
  });

  // ---- 13. Does not emit enriched when prompt builder throws ----
  describe('does not emit enriched on prompt builder error', () => {
    it('only emits message:error, not message:enriched, on builder failure', async () => {
      const builder: PromptBuilder = {
        buildSystemPrompt: jest.fn().mockImplementation(() => { throw new Error('fail'); }),
      };
      const stage = new EnrichStage(bus, mockRetriever(['m']), builder);

      const enriched = jest.fn();
      const errorListener = jest.fn();
      bus.on('message:enriched', enriched);
      bus.on('message:error', errorListener);

      await stage.process(makeAcceptedCtx());

      expect(enriched).not.toHaveBeenCalled();
      expect(errorListener).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 14. Enriched payload preserves full context ----
  describe('enriched payload preserves full context', () => {
    it('spreads all original context fields into the enriched event', async () => {
      const stage = new EnrichStage(bus, mockRetriever(['m']), mockPromptBuilder('p'));
      const msg = new StubMessage('test', 'msg-99');
      const ctx = makeAcceptedCtx({
        message: msg,
        botName: 'CtxBot',
        platform: 'discord',
        channelId: 'ch-42',
        metadata: { key: 'value' },
      });

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(ctx);

      const payload = enriched.mock.calls[0][0];
      expect(payload.message).toBe(msg);
      expect(payload.botName).toBe('CtxBot');
      expect(payload.platform).toBe('discord');
      expect(payload.channelId).toBe('ch-42');
      expect(payload.metadata).toEqual({ key: 'value' });
    });
  });

  // ---- 15. Memory retrieval does not crash the stage ----
  describe('memory retrieval does not crash the stage', () => {
    it('does not throw even when retriever rejects', async () => {
      const retriever: MemoryRetriever = {
        retrieveMemories: jest.fn().mockRejectedValue(new Error('catastrophe')),
      };
      const stage = new EnrichStage(bus, retriever, mockPromptBuilder('p'));

      // Should not throw
      await expect(stage.process(makeAcceptedCtx())).resolves.toBeUndefined();
    });
  });

  // ---- 16. Fast retrieval does not trigger timeout ----
  describe('fast retrieval does not trigger timeout', () => {
    it('uses actual memories when retrieval is fast', async () => {
      const retriever: MemoryRetriever = {
        retrieveMemories: jest.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(['fast-mem']), 10)),
        ),
      };
      const stage = new EnrichStage(bus, retriever, mockPromptBuilder('p'));

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(makeAcceptedCtx());

      expect(enriched.mock.calls[0][0].memories).toEqual(['fast-mem']);
    });
  });

  // ---- 17. System prompt string passed correctly to enriched ----
  describe('system prompt value in enriched', () => {
    it('emits the exact system prompt string from the builder', async () => {
      const builder = mockPromptBuilder('You are TestBot. Be helpful and concise.');
      const stage = new EnrichStage(bus, mockRetriever([]), builder);

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await stage.process(makeAcceptedCtx());

      expect(enriched.mock.calls[0][0].systemPrompt).toBe(
        'You are TestBot. Be helpful and concise.',
      );
    });
  });

  // ---- 18. Register integration with memory error recovery ----
  describe('register integration with memory error recovery', () => {
    it('emits enriched with empty memories via the bus when retriever fails', async () => {
      const retriever: MemoryRetriever = {
        retrieveMemories: jest.fn().mockRejectedValue(new Error('network')),
      };
      const builder = mockPromptBuilder('fallback prompt');
      const stage = new EnrichStage(bus, retriever, builder);
      stage.register();

      const enriched = jest.fn();
      bus.on('message:enriched', enriched);

      await bus.emitAsync('message:accepted', makeAcceptedCtx());

      expect(enriched).toHaveBeenCalledTimes(1);
      expect(enriched.mock.calls[0][0].memories).toEqual([]);
      expect(enriched.mock.calls[0][0].systemPrompt).toBe('fallback prompt');
    });
  });
});
