/**
 * Tests for SendStage -- Pipeline Stage 5.
 *
 * SendStage listens for `message:response` events on the MessageBus,
 * formats and splits the response, sends each part to the platform,
 * stores conversation memory (fire-and-forget), and emits `message:sent`
 * or `message:error`.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
import { SendStage, type MemoryStorer, type MessageSender } from '@src/pipeline/SendStage';
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

type ResponseContext = MessageContext & { responseText: string };

function makeCtx(overrides: Partial<ResponseContext> = {}): ResponseContext {
  return {
    message: new StubMessage(),
    history: [],
    botConfig: {},
    botName: 'TestBot',
    platform: 'test',
    channelId: 'ch-1',
    metadata: {},
    responseText: 'Hello, world!',
    ...overrides,
  };
}

/** Creates a mock MessageSender that resolves successfully. */
function mockSender(): MessageSender & { sendToChannel: jest.Mock } {
  return {
    sendToChannel: jest.fn().mockResolvedValue(undefined),
  };
}

/** Creates a mock MemoryStorer that resolves successfully. */
function mockMemoryStorer(): MemoryStorer & { storeMemory: jest.Mock } {
  return {
    storeMemory: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Generate a string of the given length, composed of words separated by
 * spaces and/or newlines so splitting logic can be tested realistically.
 */
function makeText(length: number, separator = ' '): string {
  const word = 'word';
  const parts: string[] = [];
  let current = 0;
  while (current < length) {
    const remaining = length - current;
    if (remaining <= word.length) {
      parts.push('x'.repeat(remaining));
      break;
    }
    parts.push(word);
    current += word.length + separator.length;
  }
  return parts.join(separator).slice(0, length);
}

/** Flush the microtask queue so fire-and-forget promises settle. */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SendStage', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  // ---- 1. Sends response to channel ----
  describe('sends response to channel', () => {
    it('calls sendToChannel with the response text', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      const ctx = makeCtx({ responseText: 'Hi!' });

      await stage.process(ctx);

      expect(sender.sendToChannel).toHaveBeenCalledTimes(1);
      expect(sender.sendToChannel).toHaveBeenCalledWith('ch-1', 'Hi!', 'TestBot');
    });
  });

  // ---- 2. Correct channelId and botName passed to sender ----
  describe('correct channelId and botName', () => {
    it('passes the context channelId and botName to the sender', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      const ctx = makeCtx({ channelId: 'ch-42', botName: 'AlphaBot', responseText: 'yo' });

      await stage.process(ctx);

      expect(sender.sendToChannel).toHaveBeenCalledWith('ch-42', 'yo', 'AlphaBot');
    });
  });

  // ---- 3. Short message -- single part ----
  describe('short message produces single part', () => {
    it('sends a message under 2000 chars as a single part', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      const ctx = makeCtx({ responseText: 'Short reply.' });

      await stage.process(ctx);

      expect(sender.sendToChannel).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 4. Long message (>2000) -- split into multiple parts ----
  describe('long message split into multiple parts', () => {
    it('splits a message longer than 2000 chars', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      // Create a long message with newlines to allow clean splitting.
      const lines: string[] = [];
      while (lines.join('\n').length < 2500) {
        lines.push('This is a line of text that is reasonably long to fill up space quickly.');
      }
      const longText = lines.join('\n');
      const ctx = makeCtx({ responseText: longText });

      await stage.process(ctx);

      expect(sender.sendToChannel.mock.calls.length).toBeGreaterThan(1);
    });
  });

  // ---- 5. Split respects newline boundaries ----
  describe('split respects newline boundaries', () => {
    it('splits at the last newline before the 2000-char limit', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      // Build a message: line of 1990 chars, then newline, then more text.
      const line1 = 'a'.repeat(1990);
      const line2 = 'b'.repeat(500);
      const longText = `${line1}\n${line2}`;
      const ctx = makeCtx({ responseText: longText });

      await stage.process(ctx);

      expect(sender.sendToChannel).toHaveBeenCalledTimes(2);
      expect(sender.sendToChannel.mock.calls[0][1]).toBe(line1);
      expect(sender.sendToChannel.mock.calls[1][1]).toBe(line2);
    });
  });

  // ---- 6. Each part sent separately ----
  describe('each part sent separately', () => {
    it('calls sendToChannel once per part', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      // Three chunks separated by newlines, each under 2000 but total > 2000.
      const chunk = 'x'.repeat(800);
      const longText = `${chunk}\n${chunk}\n${chunk}`;
      const ctx = makeCtx({ responseText: longText });

      await stage.process(ctx);

      // Total ~2402 chars, splits into 2 parts.
      expect(sender.sendToChannel.mock.calls.length).toBeGreaterThanOrEqual(2);
      // Each call sends the correct channelId and botName.
      for (const call of sender.sendToChannel.mock.calls) {
        expect(call[0]).toBe('ch-1');
        expect(call[2]).toBe('TestBot');
      }
    });
  });

  // ---- 7. Emits message:sent with parts array ----
  describe('emits message:sent with parts array', () => {
    it('emits message:sent with responseText and parts', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      const ctx = makeCtx({ responseText: 'Simple reply' });
      await stage.process(ctx);

      expect(sentListener).toHaveBeenCalledTimes(1);
      const payload = sentListener.mock.calls[0][0];
      expect(payload.responseText).toBe('Simple reply');
      expect(payload.parts).toEqual(['Simple reply']);
    });

    it('includes multiple parts in message:sent for long messages', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      const line1 = 'a'.repeat(1990);
      const line2 = 'b'.repeat(500);
      const ctx = makeCtx({ responseText: `${line1}\n${line2}` });
      await stage.process(ctx);

      const payload = sentListener.mock.calls[0][0];
      expect(payload.parts).toHaveLength(2);
      expect(payload.parts[0]).toBe(line1);
      expect(payload.parts[1]).toBe(line2);
    });
  });

  // ---- 8. register() hooks to message:response ----
  describe('register()', () => {
    it('adds a listener for message:response on the bus', () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      expect(bus.listenerCount('message:response')).toBe(0);

      stage.register();

      expect(bus.listenerCount('message:response')).toBe(1);
    });
  });

  // ---- 9. Integration -- response event flows to sent ----
  describe('register() integration', () => {
    it('processes a message:response event end-to-end', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      stage.register();

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      const ctx = makeCtx({ responseText: 'Integrated reply' });
      await bus.emitAsync('message:response', ctx);

      expect(sender.sendToChannel).toHaveBeenCalledTimes(1);
      expect(sentListener).toHaveBeenCalledTimes(1);
      expect(sentListener).toHaveBeenCalledWith(
        expect.objectContaining({ responseText: 'Integrated reply' })
      );
    });
  });

  // ---- 10. Send error -- emits message:error ----
  describe('send error', () => {
    it('emits message:error with stage="send" when sender throws', async () => {
      const sender = mockSender();
      sender.sendToChannel.mockRejectedValue(new Error('Network failure'));
      const stage = new SendStage(bus, sender);

      const errorListener = jest.fn();
      bus.on('message:error', errorListener);

      await stage.process(makeCtx());

      expect(errorListener).toHaveBeenCalledTimes(1);
      expect(errorListener).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          stage: 'send',
        })
      );
      expect(errorListener.mock.calls[0][0].error.message).toBe('Network failure');
    });

    it('does not emit message:sent when sender throws', async () => {
      const sender = mockSender();
      sender.sendToChannel.mockRejectedValue(new Error('fail'));
      const stage = new SendStage(bus, sender);

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      await stage.process(makeCtx());

      expect(sentListener).not.toHaveBeenCalled();
    });
  });

  // ---- 11. Memory stored for user message (fire-and-forget) ----
  describe('memory stored for user message', () => {
    it('stores user message with correct params', async () => {
      const sender = mockSender();
      const memory = mockMemoryStorer();
      const stage = new SendStage(bus, sender, memory);
      const msg = new StubMessage('What is 2+2?');
      const ctx = makeCtx({ message: msg, botName: 'MathBot', channelId: 'ch-math' });

      await stage.process(ctx);
      await flushPromises();

      expect(memory.storeMemory).toHaveBeenCalledWith('MathBot', 'What is 2+2?', 'user', {
        channelId: 'ch-math',
      });
    });
  });

  // ---- 12. Memory stored for bot response (fire-and-forget) ----
  describe('memory stored for bot response', () => {
    it('stores bot response with correct params', async () => {
      const sender = mockSender();
      const memory = mockMemoryStorer();
      const stage = new SendStage(bus, sender, memory);
      const ctx = makeCtx({
        responseText: 'The answer is 4.',
        botName: 'MathBot',
        channelId: 'ch-math',
      });

      await stage.process(ctx);
      await flushPromises();

      expect(memory.storeMemory).toHaveBeenCalledWith('MathBot', 'The answer is 4.', 'assistant', {
        channelId: 'ch-math',
      });
    });
  });

  // ---- 13. No memoryStorer -- works without it ----
  describe('no memoryStorer', () => {
    it('completes successfully without a memoryStorer', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender); // no memoryStorer

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      await stage.process(makeCtx());

      expect(sentListener).toHaveBeenCalledTimes(1);
      expect(sender.sendToChannel).toHaveBeenCalledTimes(1);
    });
  });

  // ---- 14. Memory error doesn't affect send ----
  describe('memory error does not affect send', () => {
    it('emits message:sent even when memory storage fails', async () => {
      const sender = mockSender();
      const memory = mockMemoryStorer();
      memory.storeMemory.mockRejectedValue(new Error('DB down'));
      const stage = new SendStage(bus, sender, memory);

      const sentListener = jest.fn();
      const errorListener = jest.fn();
      bus.on('message:sent', sentListener);
      bus.on('message:error', errorListener);

      await stage.process(makeCtx());
      await flushPromises();

      // Send still succeeded.
      expect(sentListener).toHaveBeenCalledTimes(1);
      // No message:error emitted for memory failure.
      expect(errorListener).not.toHaveBeenCalled();
    });
  });

  // ---- 15. Whitespace trimmed from response ----
  describe('whitespace trimmed', () => {
    it('trims leading and trailing whitespace from responseText', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      const ctx = makeCtx({ responseText: '  \n  Hello!  \n  ' });

      await stage.process(ctx);

      expect(sender.sendToChannel).toHaveBeenCalledWith('ch-1', 'Hello!', 'TestBot');
    });
  });

  // ---- 16. Empty response after trim -- does not send ----
  describe('empty response after trim', () => {
    it('does not send or emit when response is only whitespace', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      const ctx = makeCtx({ responseText: '   \n\n   ' });

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      await stage.process(ctx);

      expect(sender.sendToChannel).not.toHaveBeenCalled();
      expect(sentListener).not.toHaveBeenCalled();
    });
  });

  // ---- 17. responseText preserved in sent event ----
  describe('responseText preserved in sent event', () => {
    it('includes the trimmed responseText in the message:sent payload', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      const ctx = makeCtx({ responseText: '  Trimmed response  ' });
      await stage.process(ctx);

      const payload = sentListener.mock.calls[0][0];
      expect(payload.responseText).toBe('Trimmed response');
    });
  });

  // ---- 18. Multiple responses processed independently ----
  describe('multiple responses processed independently', () => {
    it('handles multiple process() calls independently', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);
      stage.register();

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      await bus.emitAsync('message:response', makeCtx({ responseText: 'First' }));
      await bus.emitAsync('message:response', makeCtx({ responseText: 'Second' }));
      await bus.emitAsync('message:response', makeCtx({ responseText: 'Third' }));

      expect(sender.sendToChannel).toHaveBeenCalledTimes(3);
      expect(sentListener).toHaveBeenCalledTimes(3);

      expect(sentListener.mock.calls[0][0].responseText).toBe('First');
      expect(sentListener.mock.calls[1][0].responseText).toBe('Second');
      expect(sentListener.mock.calls[2][0].responseText).toBe('Third');
    });
  });

  // ---- 19. Non-Error throw from sender is wrapped ----
  describe('non-Error throw from sender', () => {
    it('wraps a non-Error throw into an Error object', async () => {
      const sender = mockSender();
      sender.sendToChannel.mockRejectedValue('string error');
      const stage = new SendStage(bus, sender);

      const errorListener = jest.fn();
      bus.on('message:error', errorListener);

      await stage.process(makeCtx());

      expect(errorListener).toHaveBeenCalledTimes(1);
      const payload = errorListener.mock.calls[0][0];
      expect(payload.error).toBeInstanceOf(Error);
      expect(payload.error.message).toBe('string error');
      expect(payload.stage).toBe('send');
    });
  });

  // ---- 20. Memory stores both user and assistant messages ----
  describe('memory stores both user and assistant', () => {
    it('calls storeMemory exactly twice: once for user, once for assistant', async () => {
      const sender = mockSender();
      const memory = mockMemoryStorer();
      const stage = new SendStage(bus, sender, memory);

      await stage.process(makeCtx({ responseText: 'Bot reply' }));
      await flushPromises();

      expect(memory.storeMemory).toHaveBeenCalledTimes(2);

      const calls = memory.storeMemory.mock.calls;
      const roles = calls.map((c: any[]) => c[2]);
      expect(roles).toContain('user');
      expect(roles).toContain('assistant');
    });
  });

  // ---- 21. Context fields preserved in sent event ----
  describe('context fields preserved in sent event', () => {
    it('includes botName, platform, channelId in message:sent', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      const sentListener = jest.fn();
      bus.on('message:sent', sentListener);

      const ctx = makeCtx({ botName: 'Alpha', platform: 'discord', channelId: 'ch-99' });
      await stage.process(ctx);

      const payload = sentListener.mock.calls[0][0];
      expect(payload.botName).toBe('Alpha');
      expect(payload.platform).toBe('discord');
      expect(payload.channelId).toBe('ch-99');
    });
  });

  // ---- 22. Split avoids mid-word breaks (uses space fallback) ----
  describe('split avoids mid-word breaks', () => {
    it('falls back to splitting at last space when no newline exists', async () => {
      const sender = mockSender();
      const stage = new SendStage(bus, sender);

      // Build a single line > 2000 chars with spaces.
      const words = Array(500).fill('longword');
      const longLine = words.join(' '); // "longword longword ..." ~ 4499 chars
      const ctx = makeCtx({ responseText: longLine });

      await stage.process(ctx);

      // Each part should be within the limit.
      for (const call of sender.sendToChannel.mock.calls) {
        const part: string = call[1];
        expect(part.length).toBeLessThanOrEqual(2000);
        // Each part should consist of complete words only (no partial "longwor").
        const partWords = part.split(' ');
        for (const w of partWords) {
          expect(w).toBe('longword');
        }
      }
      expect(sender.sendToChannel.mock.calls.length).toBeGreaterThan(1);
    });
  });
});
