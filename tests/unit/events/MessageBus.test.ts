/**
 * TDD red-phase tests for MessageBus — a typed, singleton EventEmitter
 * that drives the open-hivemind message processing pipeline.
 *
 * The implementation at @src/events/MessageBus does NOT exist yet.
 * Every test here should FAIL until the implementation is written.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext, MessageEvents } from '@src/events/types';
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MessageBus', () => {
  let bus: InstanceType<typeof MessageBus>;

  beforeEach(() => {
    // Ensure a clean bus for every test
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  // 1. Singleton pattern
  describe('singleton', () => {
    it('returns the same instance on repeated calls', () => {
      const a = MessageBus.getInstance();
      const b = MessageBus.getInstance();
      expect(a).toBe(b);
    });

    it('returns a fresh instance after reset()', () => {
      const before = MessageBus.getInstance();
      before.reset();
      const after = MessageBus.getInstance();
      expect(before).not.toBe(after);
    });
  });

  // 2. Basic emit / subscribe
  describe('emit and on', () => {
    it('delivers payload to a registered listener', () => {
      const ctx = makeCtx();
      const listener = jest.fn();

      bus.on('message:incoming', listener);
      bus.emit('message:incoming', ctx);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(ctx);
    });

    it('does not deliver events the listener is not subscribed to', () => {
      const listener = jest.fn();
      bus.on('message:incoming', listener);
      bus.emit('message:validated', makeCtx());

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // 3. Type safety — different payload shapes
  describe('typed payloads', () => {
    it('carries decision field on message:accepted', () => {
      const decision = { shouldReply: true, reason: 'mentioned' };
      const listener = jest.fn();

      bus.on('message:accepted', listener);
      bus.emit('message:accepted', { ...makeCtx(), decision });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ decision }),
      );
    });

    it('carries reason string on message:skipped', () => {
      const listener = jest.fn();
      bus.on('message:skipped', listener);
      bus.emit('message:skipped', { ...makeCtx(), reason: 'off-topic' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'off-topic' }),
      );
    });

    it('carries error and stage on message:error', () => {
      const error = new Error('boom');
      const listener = jest.fn();
      bus.on('message:error', listener);
      bus.emit('message:error', { ...makeCtx(), error, stage: 'enrichment' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ error, stage: 'enrichment' }),
      );
    });

    it('carries memories and systemPrompt on message:enriched', () => {
      const payload = {
        ...makeCtx(),
        memories: ['mem-1', 'mem-2'],
        systemPrompt: 'You are helpful.',
      };
      const listener = jest.fn();
      bus.on('message:enriched', listener);
      bus.emit('message:enriched', payload);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          memories: ['mem-1', 'mem-2'],
          systemPrompt: 'You are helpful.',
        }),
      );
    });

    it('carries responseText and parts on message:sent', () => {
      const payload = {
        ...makeCtx(),
        responseText: 'Hello there!',
        parts: ['Hello', 'there!'],
      };
      const listener = jest.fn();
      bus.on('message:sent', listener);
      bus.emit('message:sent', payload);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          responseText: 'Hello there!',
          parts: ['Hello', 'there!'],
        }),
      );
    });
  });

  // 4. Multiple listeners
  describe('multiple listeners', () => {
    it('calls all listeners registered for the same event', () => {
      const a = jest.fn();
      const b = jest.fn();
      const c = jest.fn();

      bus.on('message:incoming', a);
      bus.on('message:incoming', b);
      bus.on('message:incoming', c);
      bus.emit('message:incoming', makeCtx());

      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
      expect(c).toHaveBeenCalledTimes(1);
    });
  });

  // 5. Unsubscribe
  describe('off / unsubscribe', () => {
    it('removes a specific listener so it no longer fires', () => {
      const listener = jest.fn();
      bus.on('message:incoming', listener);
      bus.off('message:incoming', listener);
      bus.emit('message:incoming', makeCtx());

      expect(listener).not.toHaveBeenCalled();
    });

    it('does not affect other listeners on the same event', () => {
      const keep = jest.fn();
      const remove = jest.fn();

      bus.on('message:incoming', keep);
      bus.on('message:incoming', remove);
      bus.off('message:incoming', remove);
      bus.emit('message:incoming', makeCtx());

      expect(keep).toHaveBeenCalledTimes(1);
      expect(remove).not.toHaveBeenCalled();
    });

    it('is a no-op when removing a listener that was never added', () => {
      expect(() => {
        bus.off('message:incoming', jest.fn());
      }).not.toThrow();
    });
  });

  // 6. Error isolation
  describe('error isolation', () => {
    it('continues calling remaining listeners when one throws synchronously', () => {
      const bad = jest.fn(() => { throw new Error('listener blew up'); });
      const good = jest.fn();

      bus.on('message:incoming', bad);
      bus.on('message:incoming', good);
      bus.emit('message:incoming', makeCtx());

      expect(bad).toHaveBeenCalledTimes(1);
      expect(good).toHaveBeenCalledTimes(1);
    });

    it('continues calling remaining listeners when one rejects (async)', async () => {
      const bad = jest.fn(async () => { throw new Error('async boom'); });
      const good = jest.fn();

      bus.on('message:incoming', bad);
      bus.on('message:incoming', good);
      await bus.emitAsync('message:incoming', makeCtx());

      expect(bad).toHaveBeenCalledTimes(1);
      expect(good).toHaveBeenCalledTimes(1);
    });
  });

  // 7. Error logging
  describe('error logging', () => {
    it('catches errors from throwing listeners without re-throwing', () => {
      const bad = jest.fn(() => { throw new Error('kaboom'); });
      const good = jest.fn();

      bus.on('message:validated', bad);
      bus.on('message:validated', good);

      // Should not throw — errors are caught internally (logged via debug)
      expect(() => bus.emit('message:validated', makeCtx())).not.toThrow();

      // Both listeners were called; the error didn't prevent the second
      expect(bad).toHaveBeenCalledTimes(1);
      expect(good).toHaveBeenCalledTimes(1);
    });
  });

  // 8. once()
  describe('once', () => {
    it('fires the listener exactly once then auto-removes', () => {
      const listener = jest.fn();
      bus.once('message:incoming', listener);

      bus.emit('message:incoming', makeCtx());
      bus.emit('message:incoming', makeCtx());
      bus.emit('message:incoming', makeCtx());

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not interfere with other permanent listeners', () => {
      const permanent = jest.fn();
      const oneShot = jest.fn();

      bus.on('message:incoming', permanent);
      bus.once('message:incoming', oneShot);

      bus.emit('message:incoming', makeCtx());
      bus.emit('message:incoming', makeCtx());

      expect(permanent).toHaveBeenCalledTimes(2);
      expect(oneShot).toHaveBeenCalledTimes(1);
    });
  });

  // 9. Async listeners
  describe('async listeners', () => {
    it('supports async listener functions', async () => {
      const order: number[] = [];
      bus.on('message:incoming', async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(1);
      });
      bus.on('message:incoming', async () => {
        order.push(2);
      });

      await bus.emitAsync('message:incoming', makeCtx());

      expect(order).toContain(1);
      expect(order).toContain(2);
    });
  });

  // 10. emitAsync()
  describe('emitAsync', () => {
    it('returns a promise that resolves when all listeners complete', async () => {
      let completed = false;
      bus.on('message:response', async () => {
        await new Promise((r) => setTimeout(r, 20));
        completed = true;
      });

      await bus.emitAsync('message:response', {
        ...makeCtx(),
        responseText: 'hi',
      });

      expect(completed).toBe(true);
    });

    it('resolves even when there are no listeners', async () => {
      await expect(
        bus.emitAsync('message:incoming', makeCtx()),
      ).resolves.toBeUndefined();
    });

    it('does not reject when a listener throws — errors are caught internally', async () => {
      bus.on('message:incoming', async () => {
        throw new Error('async failure');
      });

      await expect(
        bus.emitAsync('message:incoming', makeCtx()),
      ).resolves.toBeUndefined();
    });
  });

  // 11. Event ordering
  describe('listener ordering', () => {
    it('calls listeners in the order they were registered', () => {
      const order: number[] = [];

      bus.on('message:incoming', () => order.push(1));
      bus.on('message:incoming', () => order.push(2));
      bus.on('message:incoming', () => order.push(3));

      bus.emit('message:incoming', makeCtx());

      expect(order).toEqual([1, 2, 3]);
    });
  });

  // 12. No listeners
  describe('no listeners', () => {
    it('emitting with no registered listeners does not throw', () => {
      expect(() => {
        bus.emit('message:incoming', makeCtx());
      }).not.toThrow();
    });

    it('emitting on event that never had listeners does not throw', () => {
      expect(() => {
        bus.emit('message:error', {
          ...makeCtx(),
          error: new Error('orphan'),
          stage: 'test',
        });
      }).not.toThrow();
    });
  });

  // 13. Reset
  describe('reset', () => {
    it('clears all listeners from all events', () => {
      const a = jest.fn();
      const b = jest.fn();

      bus.on('message:incoming', a);
      bus.on('message:validated', b);

      bus.reset();

      bus.emit('message:incoming', makeCtx());
      bus.emit('message:validated', makeCtx());

      expect(a).not.toHaveBeenCalled();
      expect(b).not.toHaveBeenCalled();
    });

    it('allows re-registration after reset', () => {
      const listener = jest.fn();
      bus.on('message:incoming', listener);
      bus.reset();
      bus.on('message:incoming', listener);
      bus.emit('message:incoming', makeCtx());

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('resets listener counts to zero', () => {
      bus.on('message:incoming', jest.fn());
      bus.on('message:incoming', jest.fn());
      bus.reset();

      expect(bus.listenerCount('message:incoming')).toBe(0);
    });
  });

  // 14. Listener count
  describe('listenerCount', () => {
    it('returns 0 for an event with no listeners', () => {
      expect(bus.listenerCount('message:incoming')).toBe(0);
    });

    it('returns the correct count after adding listeners', () => {
      bus.on('message:incoming', jest.fn());
      bus.on('message:incoming', jest.fn());
      bus.on('message:validated', jest.fn());

      expect(bus.listenerCount('message:incoming')).toBe(2);
      expect(bus.listenerCount('message:validated')).toBe(1);
    });

    it('decrements when a listener is removed', () => {
      const fn = jest.fn();
      bus.on('message:incoming', fn);
      bus.on('message:incoming', jest.fn());

      expect(bus.listenerCount('message:incoming')).toBe(2);

      bus.off('message:incoming', fn);

      expect(bus.listenerCount('message:incoming')).toBe(1);
    });

    it('decrements after a once() listener fires', () => {
      bus.once('message:incoming', jest.fn());
      expect(bus.listenerCount('message:incoming')).toBe(1);

      bus.emit('message:incoming', makeCtx());
      expect(bus.listenerCount('message:incoming')).toBe(0);
    });
  });
});
