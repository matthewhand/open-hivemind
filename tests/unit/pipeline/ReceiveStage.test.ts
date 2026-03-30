/**
 * TDD red-phase tests for ReceiveStage — the first stage of the message
 * processing pipeline.
 *
 * ReceiveStage receives raw messages from platform adapters, validates them,
 * resolves the bot identity, and emits `message:validated` on the MessageBus.
 *
 * The implementation at @src/pipeline/ReceiveStage does NOT exist yet.
 * Every test here should FAIL until the implementation is written.
 */

import { ReceiveStage } from '@src/pipeline/ReceiveStage';
import { MessageBus } from '@src/events/MessageBus';
import type { MessageContext } from '@src/events/types';
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReceiveStage', () => {
  let bus: InstanceType<typeof MessageBus>;
  let stage: ReceiveStage;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    stage = new ReceiveStage(bus);
  });

  // -------------------------------------------------------------------------
  // 1. Valid message — returns MessageContext with correct fields
  // -------------------------------------------------------------------------
  describe('valid message processing', () => {
    it('returns a MessageContext with correct fields for a valid message', async () => {
      const msg = new StubMessage('hello world');
      const history: IMessage[] = [];
      const botConfig = { BOT_NAME: 'MyBot' };

      const result = await stage.process(msg, history, botConfig);

      expect(result).not.toBeNull();
      expect(result!.message).toBe(msg);
      expect(result!.botName).toBe('MyBot');
      expect(result!.platform).toBe('test');
      expect(result!.channelId).toBe('ch-1');
    });
  });

  // -------------------------------------------------------------------------
  // 2–3. Empty / whitespace-only text — returns null
  // -------------------------------------------------------------------------
  describe('validation rejects invalid text', () => {
    it('returns null for empty text', async () => {
      const msg = new StubMessage('');
      const result = await stage.process(msg, [], {});
      expect(result).toBeNull();
    });

    it('returns null for whitespace-only text', async () => {
      const msg = new StubMessage('   \t\n  ');
      const result = await stage.process(msg, [], {});
      expect(result).toBeNull();
    });

    it('returns null when text is only control characters', async () => {
      const msg = new StubMessage('\x00\x01\x02\x03');
      const result = await stage.process(msg, [], {});
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // 4–5. Sanitization
  // -------------------------------------------------------------------------
  describe('text sanitization', () => {
    it('strips leading and trailing whitespace from message text', async () => {
      const msg = new StubMessage('  hello world  ');
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      // The sanitized text should be reflected in the context message
      expect(result!.message.getText()).toBe('hello world');
    });

    it('strips control characters (\\x00-\\x1F) except \\n and \\t', async () => {
      const msg = new StubMessage('hel\x00lo\x07 wor\x1Fld');
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      const text = result!.message.getText();
      expect(text).toBe('hello world');
      // Ensure no control chars remain (except \n and \t)
      expect(text).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
    });

    it('preserves newlines and tabs in message text', async () => {
      const msg = new StubMessage('line1\nline2\tindented');
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      expect(result!.message.getText()).toBe('line1\nline2\tindented');
    });
  });

  // -------------------------------------------------------------------------
  // 6–8. Bot name resolution
  // -------------------------------------------------------------------------
  describe('bot name resolution', () => {
    it('uses botConfig.BOT_NAME when present', async () => {
      const msg = new StubMessage('hi');
      const result = await stage.process(msg, [], { BOT_NAME: 'AlphaBot' });

      expect(result).not.toBeNull();
      expect(result!.botName).toBe('AlphaBot');
    });

    it('falls back to botConfig.name when BOT_NAME is absent', async () => {
      const msg = new StubMessage('hi');
      const result = await stage.process(msg, [], { name: 'BetaBot' });

      expect(result).not.toBeNull();
      expect(result!.botName).toBe('BetaBot');
    });

    it('falls back to "hivemind" when neither BOT_NAME nor name is set', async () => {
      const msg = new StubMessage('hi');
      const result = await stage.process(msg, [], {});

      expect(result).not.toBeNull();
      expect(result!.botName).toBe('hivemind');
    });

    it('prefers BOT_NAME over name when both are present', async () => {
      const msg = new StubMessage('hi');
      const result = await stage.process(msg, [], {
        BOT_NAME: 'Primary',
        name: 'Secondary',
      });

      expect(result).not.toBeNull();
      expect(result!.botName).toBe('Primary');
    });
  });

  // -------------------------------------------------------------------------
  // 9–10. Platform resolution
  // -------------------------------------------------------------------------
  describe('platform resolution', () => {
    it('uses message.platform when set', async () => {
      const msg = new StubMessage('hi');
      msg.platform = 'discord';
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe('discord');
    });

    it('defaults to "unknown" when message.platform is empty', async () => {
      const msg = new StubMessage('hi');
      msg.platform = '';
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      expect(result!.platform).toBe('unknown');
    });
  });

  // -------------------------------------------------------------------------
  // 11. Channel ID extraction
  // -------------------------------------------------------------------------
  describe('channel ID', () => {
    it('extracts channelId from message.getChannelId()', async () => {
      const msg = new StubMessage('hi');
      msg.channelId = 'channel-42';
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      expect(result!.channelId).toBe('channel-42');
    });
  });

  // -------------------------------------------------------------------------
  // 12–13. Bus event emission
  // -------------------------------------------------------------------------
  describe('bus event emission', () => {
    it('emits message:validated on the bus for valid messages', async () => {
      const listener = jest.fn();
      bus.on('message:validated', listener);

      const msg = new StubMessage('hello');
      await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(listener).toHaveBeenCalledTimes(1);
      const emittedCtx: MessageContext = listener.mock.calls[0][0];
      expect(emittedCtx.message).toBe(msg);
      expect(emittedCtx.botName).toBe('Bot');
      expect(emittedCtx.platform).toBe('test');
      expect(emittedCtx.channelId).toBe('ch-1');
    });

    it('does NOT emit message:validated when text is empty', async () => {
      const listener = jest.fn();
      bus.on('message:validated', listener);

      const msg = new StubMessage('');
      await stage.process(msg, [], {});

      expect(listener).not.toHaveBeenCalled();
    });

    it('does NOT emit message:validated when text is whitespace-only', async () => {
      const listener = jest.fn();
      bus.on('message:validated', listener);

      const msg = new StubMessage('   ');
      await stage.process(msg, [], {});

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 14. History passthrough
  // -------------------------------------------------------------------------
  describe('history passthrough', () => {
    it('passes the history array through to the context', async () => {
      const history = [new StubMessage('prev1'), new StubMessage('prev2')];
      const msg = new StubMessage('current');

      const result = await stage.process(msg, history, { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      expect(result!.history).toBe(history);
      expect(result!.history).toHaveLength(2);
    });

    it('handles empty history array', async () => {
      const msg = new StubMessage('hello');
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      expect(result!.history).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // 15. BotConfig passthrough
  // -------------------------------------------------------------------------
  describe('botConfig passthrough', () => {
    it('passes botConfig through to the context', async () => {
      const botConfig = { BOT_NAME: 'Bot', customSetting: true, threshold: 0.5 };
      const msg = new StubMessage('hello');

      const result = await stage.process(msg, [], botConfig);

      expect(result).not.toBeNull();
      expect(result!.botConfig).toBe(botConfig);
    });
  });

  // -------------------------------------------------------------------------
  // 16. Metadata initialized
  // -------------------------------------------------------------------------
  describe('metadata initialization', () => {
    it('initializes metadata as an empty object', async () => {
      const msg = new StubMessage('hello');
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(result).not.toBeNull();
      expect(result!.metadata).toEqual({});
      expect(typeof result!.metadata).toBe('object');
    });
  });

  // -------------------------------------------------------------------------
  // 17–18. register()
  // -------------------------------------------------------------------------
  describe('register()', () => {
    it('sets up a bus listener for message:incoming', () => {
      const countBefore = bus.listenerCount('message:incoming');
      stage.register();
      const countAfter = bus.listenerCount('message:incoming');

      expect(countAfter).toBe(countBefore + 1);
    });

    it('triggers process when message:incoming is emitted on the bus', async () => {
      const validatedListener = jest.fn();
      bus.on('message:validated', validatedListener);

      stage.register();

      const msg = new StubMessage('from bus');
      const ctx: MessageContext = {
        message: msg,
        history: [],
        botConfig: { BOT_NAME: 'BusBot' },
        botName: '',
        platform: '',
        channelId: '',
        metadata: {},
      };

      await bus.emitAsync('message:incoming', ctx);

      expect(validatedListener).toHaveBeenCalledTimes(1);
      const emittedCtx = validatedListener.mock.calls[0][0];
      expect(emittedCtx.botName).toBe('BusBot');
      expect(emittedCtx.message).toBe(msg);
    });

    it('does not emit validated when incoming message has empty text', async () => {
      const validatedListener = jest.fn();
      bus.on('message:validated', validatedListener);

      stage.register();

      const msg = new StubMessage('');
      const ctx: MessageContext = {
        message: msg,
        history: [],
        botConfig: {},
        botName: '',
        platform: '',
        channelId: '',
        metadata: {},
      };

      await bus.emitAsync('message:incoming', ctx);

      expect(validatedListener).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Context shape correctness
  // -------------------------------------------------------------------------
  describe('returned context shape', () => {
    it('contains all required MessageContext fields', async () => {
      const msg = new StubMessage('test message');
      const result = await stage.process(msg, [], { BOT_NAME: 'ShapeBot' });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('history');
      expect(result).toHaveProperty('botConfig');
      expect(result).toHaveProperty('botName');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('channelId');
      expect(result).toHaveProperty('metadata');
    });

    it('emitted context matches the returned context', async () => {
      const listener = jest.fn();
      bus.on('message:validated', listener);

      const msg = new StubMessage('sync check');
      const result = await stage.process(msg, [], { BOT_NAME: 'Bot' });

      expect(listener).toHaveBeenCalledTimes(1);
      const emittedCtx = listener.mock.calls[0][0];
      expect(emittedCtx).toEqual(result);
    });
  });
});
