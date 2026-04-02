/**
 * Tests for InferenceStage — Pipeline Stage 4.
 *
 * InferenceStage listens for `message:enriched` events on the MessageBus,
 * delegates to an injectable LlmInvoker, and emits `message:response`,
 * `message:skipped`, or `message:error` depending on the outcome.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import { InferenceStage, type LlmInvoker } from '@src/pipeline/InferenceStage';
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

type EnrichedContext = MessageContext & { memories: string[]; systemPrompt: string };

function makeCtx(overrides: Partial<EnrichedContext> = {}): EnrichedContext {
  return {
    message: new StubMessage(),
    history: [],
    botConfig: {},
    botName: 'TestBot',
    platform: 'test',
    channelId: 'ch-1',
    metadata: {},
    memories: ['memory-1'],
    systemPrompt: 'You are a helpful assistant.',
    ...overrides,
  };
}

/** Creates a mock LlmInvoker that returns the given response. */
function mockInvoker(response: string): LlmInvoker {
  return {
    generateResponse: jest.fn().mockResolvedValue(response),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InferenceStage', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  // ---- 1. Successful inference — generates and emits response ----
  describe('successful inference', () => {
    it('emits message:response on successful LLM call', async () => {
      const invoker = mockInvoker('Hello there!');
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx();

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(ctx);

      expect(response).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 2. LLM returns text — responseText matches ----
  describe('responseText matches LLM output', () => {
    it('emits message:response with the exact text from the LLM', async () => {
      const invoker = mockInvoker('The answer is 42.');
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx();

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(ctx);

      expect(response).toHaveBeenCalledWith(
        expect.objectContaining({ responseText: 'The answer is 42.' })
      );
    });
  });

  // ---- 3. Empty LLM response — emits message:skipped ----
  describe('empty LLM response', () => {
    it('emits message:skipped with reason when LLM returns empty string', async () => {
      const invoker = mockInvoker('');
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx();

      const skipped = jest.fn();
      bus.on('message:skipped', skipped);

      await stage.process(ctx);

      expect(skipped).toHaveBeenCalledTimes(1);
      expect(skipped).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'empty LLM response' })
      );
    });

    it('does not emit message:response when LLM returns empty string', async () => {
      const invoker = mockInvoker('');
      const stage = new InferenceStage(bus, invoker);

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(makeCtx());

      expect(response).not.toHaveBeenCalled();
    });
  });

  // ---- 4. LLM error — emits message:error with stage='inference' ----
  describe('LLM error', () => {
    it('emits message:error with stage="inference" when LLM throws', async () => {
      const invoker: LlmInvoker = {
        generateResponse: jest.fn().mockRejectedValue(new Error('LLM timeout')),
      };
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx();

      const errorListener = jest.fn();
      bus.on('message:error', errorListener);

      await stage.process(ctx);

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          stage: 'inference',
        })
      );
      expect(errorListener.mock.calls[0][0].error.message).toBe('LLM timeout');
    });

    it('does not emit message:response when LLM throws', async () => {
      const invoker: LlmInvoker = {
        generateResponse: jest.fn().mockRejectedValue(new Error('fail')),
      };
      const stage = new InferenceStage(bus, invoker);

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(makeCtx());

      expect(response).not.toHaveBeenCalled();
    });
  });

  // ---- 5. register() hooks to message:enriched ----
  describe('register()', () => {
    it('adds a listener for message:enriched on the bus', () => {
      const invoker = mockInvoker('ok');
      const stage = new InferenceStage(bus, invoker);

      expect(bus.listenerCount('message:enriched')).toBe(0);

      stage.register();

      expect(bus.listenerCount('message:enriched')).toBe(1);
    });
  });

  // ---- 6. Integration — enriched event triggers response ----
  describe('register() integration', () => {
    it('processes a message:enriched event end-to-end', async () => {
      const invoker = mockInvoker('Hi from LLM');
      const stage = new InferenceStage(bus, invoker);
      stage.register();

      const response = jest.fn();
      bus.on('message:response', response);

      const ctx = makeCtx();
      await bus.emitAsync('message:enriched', ctx);

      expect(invoker.generateResponse).toHaveBeenCalledTimes(1);
      expect(response).toHaveBeenCalledTimes(1);
      expect(response).toHaveBeenCalledWith(
        expect.objectContaining({ responseText: 'Hi from LLM' })
      );
    });

    it('emits message:skipped when LLM returns empty via register flow', async () => {
      const invoker = mockInvoker('');
      const stage = new InferenceStage(bus, invoker);
      stage.register();

      const skipped = jest.fn();
      bus.on('message:skipped', skipped);

      await bus.emitAsync('message:enriched', makeCtx());

      expect(skipped).toHaveBeenCalledTimes(1);
      expect(skipped).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'empty LLM response' })
      );
    });
  });

  // ---- 7. User message extracted correctly ----
  describe('user message extraction', () => {
    it('extracts user message via getText()', async () => {
      const invoker = mockInvoker('response');
      const stage = new InferenceStage(bus, invoker);
      const msg = new StubMessage('What is 2+2?');
      const ctx = makeCtx({ message: msg });

      await stage.process(ctx);

      expect(invoker.generateResponse).toHaveBeenCalledWith(
        'What is 2+2?',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });

    it('falls back to message.content when getText is not a function', async () => {
      const invoker = mockInvoker('response');
      const stage = new InferenceStage(bus, invoker);
      const msg = new StubMessage('original');
      // Simulate a message without getText by overriding it
      (msg as any).getText = undefined;
      msg.content = 'fallback content';
      const ctx = makeCtx({ message: msg });

      await stage.process(ctx);

      expect(invoker.generateResponse).toHaveBeenCalledWith(
        'fallback content',
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });

  // ---- 8. History passed to LLM ----
  describe('history passed to LLM', () => {
    it('forwards the history array to generateResponse', async () => {
      const invoker = mockInvoker('ok');
      const stage = new InferenceStage(bus, invoker);
      const historyMsgs = [new StubMessage('prev-1'), new StubMessage('prev-2')];
      const ctx = makeCtx({ history: historyMsgs });

      await stage.process(ctx);

      expect(invoker.generateResponse).toHaveBeenCalledWith(
        expect.anything(),
        historyMsgs,
        expect.anything(),
        expect.anything()
      );
    });
  });

  // ---- 9. System prompt passed to LLM ----
  describe('system prompt passed to LLM', () => {
    it('forwards the systemPrompt to generateResponse', async () => {
      const invoker = mockInvoker('ok');
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx({ systemPrompt: 'Be concise.' });

      await stage.process(ctx);

      expect(invoker.generateResponse).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'Be concise.',
        expect.anything()
      );
    });
  });

  // ---- 10. Metadata passed to LLM ----
  describe('metadata passed to LLM', () => {
    it('forwards ctx.metadata to generateResponse', async () => {
      const invoker = mockInvoker('ok');
      const stage = new InferenceStage(bus, invoker);
      const meta = { temperature: 0.7, model: 'gpt-4' };
      const ctx = makeCtx({ metadata: meta });

      await stage.process(ctx);

      expect(invoker.generateResponse).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        meta
      );
    });
  });

  // ---- 11. Memories and systemPrompt pass through to response context ----
  describe('context pass-through', () => {
    it('includes memories in the emitted response context', async () => {
      const invoker = mockInvoker('answer');
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx({ memories: ['mem-a', 'mem-b'] });

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(ctx);

      const payload = response.mock.calls[0][0];
      expect(payload.memories).toEqual(['mem-a', 'mem-b']);
    });

    it('includes systemPrompt in the emitted response context', async () => {
      const invoker = mockInvoker('answer');
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx({ systemPrompt: 'Custom prompt' });

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(ctx);

      const payload = response.mock.calls[0][0];
      expect(payload.systemPrompt).toBe('Custom prompt');
    });

    it('includes botName and platform in the emitted response context', async () => {
      const invoker = mockInvoker('answer');
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx({ botName: 'MyBot', platform: 'discord' });

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(ctx);

      const payload = response.mock.calls[0][0];
      expect(payload.botName).toBe('MyBot');
      expect(payload.platform).toBe('discord');
    });
  });

  // ---- 12. Multiple inferences processed independently ----
  describe('multiple inferences', () => {
    it('processes each enriched event independently', async () => {
      let callCount = 0;
      const invoker: LlmInvoker = {
        generateResponse: jest.fn().mockImplementation(async () => {
          callCount++;
          return `response-${callCount}`;
        }),
      };
      const stage = new InferenceStage(bus, invoker);
      stage.register();

      const response = jest.fn();
      bus.on('message:response', response);

      await bus.emitAsync('message:enriched', makeCtx());
      await bus.emitAsync('message:enriched', makeCtx());
      await bus.emitAsync('message:enriched', makeCtx());

      expect(invoker.generateResponse).toHaveBeenCalledTimes(3);
      expect(response).toHaveBeenCalledTimes(3);

      expect(response.mock.calls[0][0].responseText).toBe('response-1');
      expect(response.mock.calls[1][0].responseText).toBe('response-2');
      expect(response.mock.calls[2][0].responseText).toBe('response-3');
    });
  });

  // ---- 13. Non-Error throw is wrapped ----
  describe('non-Error throw', () => {
    it('wraps non-Error throws into an Error object', async () => {
      const invoker: LlmInvoker = {
        generateResponse: jest.fn().mockRejectedValue('string error'),
      };
      const stage = new InferenceStage(bus, invoker);

      const errorListener = jest.fn();
      bus.on('message:error', errorListener);

      await stage.process(makeCtx());

      expect(errorListener).toHaveBeenCalledTimes(1);
      const payload = errorListener.mock.calls[0][0];
      expect(payload.error).toBeInstanceOf(Error);
      expect(payload.error.message).toBe('string error');
      expect(payload.stage).toBe('inference');
    });
  });

  // ---- 14. Error does not emit response or skipped ----
  describe('error does not emit response or skipped', () => {
    it('only emits message:error on LLM failure', async () => {
      const invoker: LlmInvoker = {
        generateResponse: jest.fn().mockRejectedValue(new Error('boom')),
      };
      const stage = new InferenceStage(bus, invoker);

      const response = jest.fn();
      const skipped = jest.fn();
      const errorListener = jest.fn();
      bus.on('message:response', response);
      bus.on('message:skipped', skipped);
      bus.on('message:error', errorListener);

      await stage.process(makeCtx());

      expect(response).not.toHaveBeenCalled();
      expect(skipped).not.toHaveBeenCalled();
      expect(errorListener).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 15. Skipped does not emit response or error ----
  describe('skipped does not emit response or error', () => {
    it('only emits message:skipped on empty response', async () => {
      const invoker = mockInvoker('');
      const stage = new InferenceStage(bus, invoker);

      const response = jest.fn();
      const errorListener = jest.fn();
      const skipped = jest.fn();
      bus.on('message:response', response);
      bus.on('message:error', errorListener);
      bus.on('message:skipped', skipped);

      await stage.process(makeCtx());

      expect(response).not.toHaveBeenCalled();
      expect(errorListener).not.toHaveBeenCalled();
      expect(skipped).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 16. Async LLM invoker ----
  describe('async LLM invoker', () => {
    it('handles a slow LLM call that resolves after a delay', async () => {
      const invoker: LlmInvoker = {
        generateResponse: jest.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, 50));
          return 'delayed response';
        }),
      };
      const stage = new InferenceStage(bus, invoker);

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(makeCtx());

      expect(response).toHaveBeenCalledTimes(1);
      expect(response).toHaveBeenCalledWith(
        expect.objectContaining({ responseText: 'delayed response' })
      );
    });
  });

  // ---- 17. Response payload preserves original message ----
  describe('response payload preserves message', () => {
    it('includes the original message object in the response event', async () => {
      const invoker = mockInvoker('reply');
      const stage = new InferenceStage(bus, invoker);
      const msg = new StubMessage('original question', 'msg-42');
      const ctx = makeCtx({ message: msg });

      const response = jest.fn();
      bus.on('message:response', response);

      await stage.process(ctx);

      const payload = response.mock.calls[0][0];
      expect(payload.message).toBe(msg);
      expect(payload.message.getMessageId()).toBe('msg-42');
    });
  });

  // ---- 18. Error payload preserves context fields ----
  describe('error payload preserves context', () => {
    it('includes botName, platform, and channelId in the error event', async () => {
      const invoker: LlmInvoker = {
        generateResponse: jest.fn().mockRejectedValue(new Error('oops')),
      };
      const stage = new InferenceStage(bus, invoker);
      const ctx = makeCtx({ botName: 'ErrBot', platform: 'slack', channelId: 'ch-err' });

      const errorListener = jest.fn();
      bus.on('message:error', errorListener);

      await stage.process(ctx);

      const payload = errorListener.mock.calls[0][0];
      expect(payload.botName).toBe('ErrBot');
      expect(payload.platform).toBe('slack');
      expect(payload.channelId).toBe('ch-err');
    });
  });
});
