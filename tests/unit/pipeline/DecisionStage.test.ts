/**
 * TDD red-phase tests for DecisionStage — Pipeline Stage 2.
 *
 * DecisionStage listens for `message:validated` events on the MessageBus,
 * delegates to an injectable DecisionStrategy, and emits either
 * `message:accepted` or `message:skipped` depending on the outcome.
 *
 * The implementation at @src/pipeline/DecisionStage does NOT exist yet.
 * Every test here should FAIL until the implementation is written.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext, ReplyDecision } from '@src/events/types';
import { DecisionStage, type DecisionStrategy } from '@src/pipeline/DecisionStage';
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

  getMessageId(): string {
    return this.id;
  }
  getText(): string {
    return this.text;
  }
  getTimestamp(): Date {
    return this.timestamp;
  }
  setText(t: string): void {
    this.text = t;
    this.content = t;
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
    return ['user-1'];
  }
  mentionsUsers(_userId: string): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return 'TestUser';
  }
}

function makeCtx(overrides: Partial<MessageContext> = {}): MessageContext {
  return {
    message: new StubMessage(),
    history: [],
    botConfig: {},
    botName: 'TestBot',
    platform: 'test',
    channelId: 'ch-1',
    metadata: {},
    ...overrides,
  };
}

/** Creates a mock DecisionStrategy that returns the given decision. */
function mockStrategy(decision: ReplyDecision): DecisionStrategy {
  return {
    shouldReply: jest.fn().mockResolvedValue(decision),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DecisionStage', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  // ---- 1. Accepts when strategy says yes ----
  describe('accepts when strategy says yes', () => {
    it('emits message:accepted when shouldReply is true', async () => {
      const strategy = mockStrategy({ shouldReply: true, reason: 'mentioned' });
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      await stage.process(ctx);

      expect(accepted).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 2. Skips when strategy says no ----
  describe('skips when strategy says no', () => {
    it('emits message:skipped when shouldReply is false', async () => {
      const strategy = mockStrategy({ shouldReply: false, reason: 'not relevant' });
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const skipped = jest.fn();
      bus.on('message:skipped', skipped);

      await stage.process(ctx);

      expect(skipped).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 3. Passes context to strategy ----
  describe('passes context to strategy', () => {
    it('calls strategy.shouldReply with the full MessageContext', async () => {
      const strategy = mockStrategy({ shouldReply: true, reason: 'test' });
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx({ botName: 'SpecialBot', platform: 'discord' });

      await stage.process(ctx);

      expect(strategy.shouldReply).toHaveBeenCalledTimes(1);
      expect(strategy.shouldReply).toHaveBeenCalledWith(ctx);
    });
  });

  // ---- 4. Accepted payload includes decision ----
  describe('accepted payload includes decision', () => {
    it('emits message:accepted with ctx and decision', async () => {
      const decision: ReplyDecision = { shouldReply: true, reason: 'direct mention' };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      await stage.process(ctx);

      expect(accepted).toHaveBeenCalledWith(
        expect.objectContaining({
          message: ctx.message,
          botName: ctx.botName,
          platform: ctx.platform,
          channelId: ctx.channelId,
          decision,
        })
      );
    });
  });

  // ---- 5. Skipped payload includes reason ----
  describe('skipped payload includes reason', () => {
    it('emits message:skipped with ctx and reason string', async () => {
      const decision: ReplyDecision = { shouldReply: false, reason: 'bot message' };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const skipped = jest.fn();
      bus.on('message:skipped', skipped);

      await stage.process(ctx);

      expect(skipped).toHaveBeenCalledWith(
        expect.objectContaining({
          message: ctx.message,
          botName: ctx.botName,
          reason: 'bot message',
        })
      );
    });
  });

  // ---- 6. Strategy with metadata ----
  describe('strategy with metadata', () => {
    it('passes decision.meta through in the accepted payload', async () => {
      const decision: ReplyDecision = {
        shouldReply: true,
        reason: 'high confidence',
        meta: { confidence: 0.95, matchedRule: 'direct-mention' },
      };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      await stage.process(ctx);

      const payload = accepted.mock.calls[0][0];
      expect(payload.decision.meta).toEqual({
        confidence: 0.95,
        matchedRule: 'direct-mention',
      });
    });
  });

  // ---- 7. register() listens on message:validated ----
  describe('register()', () => {
    it('adds a listener for message:validated on the bus', () => {
      const strategy = mockStrategy({ shouldReply: true, reason: 'test' });
      const stage = new DecisionStage(bus, strategy);

      expect(bus.listenerCount('message:validated')).toBe(0);

      stage.register();

      expect(bus.listenerCount('message:validated')).toBe(1);
    });
  });

  // ---- 8. register() integration — validated event triggers process ----
  describe('register() integration', () => {
    it('processes a message:validated event end-to-end', async () => {
      const decision: ReplyDecision = { shouldReply: true, reason: 'auto' };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);
      stage.register();

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      const ctx = makeCtx();
      await bus.emitAsync('message:validated', ctx);

      expect(strategy.shouldReply).toHaveBeenCalledWith(ctx);
      expect(accepted).toHaveBeenCalledTimes(1);
    });

    it('emits message:skipped when strategy rejects via register flow', async () => {
      const decision: ReplyDecision = { shouldReply: false, reason: 'ignored' };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);
      stage.register();

      const skipped = jest.fn();
      bus.on('message:skipped', skipped);

      await bus.emitAsync('message:validated', makeCtx());

      expect(skipped).toHaveBeenCalledTimes(1);
      expect(skipped).toHaveBeenCalledWith(expect.objectContaining({ reason: 'ignored' }));
    });
  });

  // ---- 9. Async strategy ----
  describe('async strategy', () => {
    it('handles a strategy that takes time to resolve', async () => {
      const strategy: DecisionStrategy = {
        shouldReply: jest.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, 50));
          return { shouldReply: true, reason: 'delayed decision' };
        }),
      };
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      const result = await stage.process(ctx);

      expect(result.shouldReply).toBe(true);
      expect(result.reason).toBe('delayed decision');
      expect(accepted).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 10. Strategy throws — emits message:error ----
  describe('strategy throws — error event', () => {
    it('emits message:error with stage="decision" when strategy throws', async () => {
      const strategy: DecisionStrategy = {
        shouldReply: jest.fn().mockRejectedValue(new Error('strategy exploded')),
      };
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const errorListener = jest.fn();
      bus.on('message:error', errorListener);

      await stage.process(ctx);

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          stage: 'decision',
        })
      );
      expect(errorListener.mock.calls[0][0].error.message).toBe('strategy exploded');
    });
  });

  // ---- 11. Strategy throws — returns fallback decision ----
  describe('strategy throws — fallback return', () => {
    it('returns { shouldReply: false } with error reason when strategy throws', async () => {
      const strategy: DecisionStrategy = {
        shouldReply: jest.fn().mockRejectedValue(new Error('kaboom')),
      };
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const result = await stage.process(ctx);

      expect(result.shouldReply).toBe(false);
      expect(result.reason).toMatch(/error/i);
      expect(result.reason).toContain('kaboom');
    });
  });

  // ---- 12. Multiple validated events — independent decisions ----
  describe('multiple validated events', () => {
    it('processes each validated event independently', async () => {
      let callCount = 0;
      const strategy: DecisionStrategy = {
        shouldReply: jest.fn().mockImplementation(async () => {
          callCount++;
          return {
            shouldReply: callCount % 2 === 1,
            reason: `call-${callCount}`,
          };
        }),
      };
      const stage = new DecisionStage(bus, strategy);
      stage.register();

      const accepted = jest.fn();
      const skipped = jest.fn();
      bus.on('message:accepted', accepted);
      bus.on('message:skipped', skipped);

      // Fire three validated events
      await bus.emitAsync('message:validated', makeCtx());
      await bus.emitAsync('message:validated', makeCtx());
      await bus.emitAsync('message:validated', makeCtx());

      expect(strategy.shouldReply).toHaveBeenCalledTimes(3);
      // Calls 1 and 3 accept (odd), call 2 skips (even)
      expect(accepted).toHaveBeenCalledTimes(2);
      expect(skipped).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 13. Always-accept strategy ----
  describe('always-accept strategy', () => {
    it('accepts every message with a trivial always-true strategy', async () => {
      const strategy = mockStrategy({ shouldReply: true, reason: 'always accept' });
      const stage = new DecisionStage(bus, strategy);

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      await stage.process(makeCtx());
      await stage.process(makeCtx());

      expect(accepted).toHaveBeenCalledTimes(2);
    });
  });

  // ---- 14. Always-reject strategy ----
  describe('always-reject strategy', () => {
    it('skips every message with a trivial always-false strategy', async () => {
      const strategy = mockStrategy({ shouldReply: false, reason: 'always reject' });
      const stage = new DecisionStage(bus, strategy);

      const skipped = jest.fn();
      bus.on('message:skipped', skipped);

      await stage.process(makeCtx());
      await stage.process(makeCtx());

      expect(skipped).toHaveBeenCalledTimes(2);
    });
  });

  // ---- 15. Probability in meta ----
  describe('probability in meta', () => {
    it('passes decision.meta.probability through in the accepted event', async () => {
      const decision: ReplyDecision = {
        shouldReply: true,
        reason: 'probabilistic match',
        meta: { probability: 0.87 },
      };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);
      const ctx = makeCtx();

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      await stage.process(ctx);

      const payload = accepted.mock.calls[0][0];
      expect(payload.decision.meta.probability).toBe(0.87);
    });
  });

  // ---- 16. Does not emit accepted when strategy says no ----
  describe('does not emit wrong event', () => {
    it('does not emit message:accepted when decision is false', async () => {
      const strategy = mockStrategy({ shouldReply: false, reason: 'nope' });
      const stage = new DecisionStage(bus, strategy);

      const accepted = jest.fn();
      bus.on('message:accepted', accepted);

      await stage.process(makeCtx());

      expect(accepted).not.toHaveBeenCalled();
    });

    it('does not emit message:skipped when decision is true', async () => {
      const strategy = mockStrategy({ shouldReply: true, reason: 'yes' });
      const stage = new DecisionStage(bus, strategy);

      const skipped = jest.fn();
      bus.on('message:skipped', skipped);

      await stage.process(makeCtx());

      expect(skipped).not.toHaveBeenCalled();
    });
  });

  // ---- 17. process() returns the decision ----
  describe('process return value', () => {
    it('returns the decision when strategy accepts', async () => {
      const decision: ReplyDecision = { shouldReply: true, reason: 'ok' };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);

      const result = await stage.process(makeCtx());

      expect(result).toEqual(decision);
    });

    it('returns the decision when strategy rejects', async () => {
      const decision: ReplyDecision = { shouldReply: false, reason: 'nah' };
      const strategy = mockStrategy(decision);
      const stage = new DecisionStage(bus, strategy);

      const result = await stage.process(makeCtx());

      expect(result).toEqual(decision);
    });
  });

  // ---- 18. Strategy error does not emit accepted or skipped ----
  describe('strategy error does not emit accepted or skipped', () => {
    it('only emits message:error, not accepted or skipped, on strategy failure', async () => {
      const strategy: DecisionStrategy = {
        shouldReply: jest.fn().mockRejectedValue(new Error('fail')),
      };
      const stage = new DecisionStage(bus, strategy);

      const accepted = jest.fn();
      const skipped = jest.fn();
      const errorListener = jest.fn();
      bus.on('message:accepted', accepted);
      bus.on('message:skipped', skipped);
      bus.on('message:error', errorListener);

      await stage.process(makeCtx());

      expect(accepted).not.toHaveBeenCalled();
      expect(skipped).not.toHaveBeenCalled();
      expect(errorListener).toHaveBeenCalledTimes(1);
    });
  });
});
