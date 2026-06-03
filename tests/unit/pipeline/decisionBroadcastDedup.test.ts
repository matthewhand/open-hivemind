/**
 * Regression test for the duplicate `pipeline:decision` broadcast.
 *
 * Before the fix, a `pipeline:decision` event was emitted TWICE per message in
 * the default pipeline path:
 *   1. inside `shouldReplyToMessage()` (full prose/roll/threshold/mods payload),
 *      reached via the DecisionStrategyAdapter, and
 *   2. inside `DecisionStage.process()` (reason + meta).
 * The live Orchestration Log therefore showed duplicate decision entries.
 *
 * After the fix, DecisionStage is the SOLE owner of the broadcast for the
 * pipeline path: the adapter passes `suppressBroadcast: true` to
 * `shouldReplyToMessage`, and DecisionStage emits exactly once with the full
 * payload (promoting `rolled`/`probability` from meta to the top-level
 * `probabilityRoll`/`threshold` fields).
 */

import { MessageBus } from '@src/events/MessageBus';
import type { MessageEvents } from '@src/events/types';
import { DecisionStage, type DecisionStrategy } from '@src/pipeline/DecisionStage';
import type { ActivityRecorder } from '@src/pipeline/ActivityRecorder';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';
import { IMessage } from '@message/interfaces/IMessage';

type DecisionEvent = MessageEvents['pipeline:decision'];

class StubMessage extends IMessage {
  constructor(
    private id = 'msg-dedup',
    private fromBot = false
  ) {
    super({}, fromBot ? 'assistant' : 'user');
    this.content = 'hello';
    this.channelId = 'ch-dedup';
    this.platform = 'discord';
  }
  getMessageId(): string {
    return this.id;
  }
  getText(): string {
    return this.content;
  }
  getTimestamp(): Date {
    return new Date();
  }
  setText(t: string): void {
    this.content = t;
  }
  getChannelId(): string {
    return this.channelId;
  }
  getAuthorId(): string {
    return this.fromBot ? 'bot-author' : 'user-1';
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
  mentionsUsers(): boolean {
    return false;
  }
  isFromBot(): boolean {
    return this.fromBot;
  }
  getAuthorName(): string {
    return 'Tester';
  }
}

function makeContext(message: IMessage) {
  return {
    message,
    history: [],
    botConfig: {},
    botName: 'TestBot',
    platform: 'discord',
    channelId: message.getChannelId(),
    metadata: {},
  };
}

function noopRecorder(): ActivityRecorder {
  return {
    recordInteraction: jest.fn(),
    recordBotResponse: jest.fn(),
  };
}

describe('pipeline:decision broadcast de-duplication', () => {
  let bus: MessageBus;
  let events: DecisionEvent[];

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    SwarmCoordinator.resetInstance();
    events = [];
    bus.on('pipeline:decision', (e) => {
      events.push(e);
    });
  });

  afterEach(() => {
    bus.reset();
  });

  it('emits pipeline:decision exactly once when accepted', async () => {
    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({
        shouldReply: true,
        reason: 'Chance roll success',
        meta: { rolled: 0.12, probability: '<0.5', SomeMod: 0.3 },
      }),
    };
    const stage = new DecisionStage(bus, strategy, noopRecorder());

    await stage.process(makeContext(new StubMessage('m-accept', false)));

    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.shouldReply).toBe(true);
    expect(ev.botName).toBe('TestBot');
    expect(ev.messageId).toBe('m-accept');
    expect(ev.channelId).toBe('ch-dedup');
    // meta fields promoted to top-level for the live log.
    expect(ev.probabilityRoll).toBe(0.12);
    expect(ev.threshold).toBe(0.5);
    // meta is preserved.
    expect(ev.meta).toMatchObject({ SomeMod: 0.3 });
  });

  it('emits pipeline:decision exactly once when skipped', async () => {
    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({
        shouldReply: false,
        reason: 'Chance roll failure',
        meta: { rolled: 0.9, probability: '<0.1' },
      }),
    };
    const stage = new DecisionStage(bus, strategy, noopRecorder());

    await stage.process(makeContext(new StubMessage('m-skip', false)));

    expect(events).toHaveLength(1);
    expect(events[0].shouldReply).toBe(false);
    expect(events[0].probabilityRoll).toBe(0.9);
    expect(events[0].threshold).toBe(0.1);
  });

  it('emits pipeline:decision exactly once when another bot already claimed', async () => {
    // Pre-claim the message under a different bot id.
    SwarmCoordinator.getInstance().claimMessage('m-claimed', 'OtherBot');

    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({ shouldReply: true, reason: 'should not run' }),
    };
    const stage = new DecisionStage(bus, strategy, noopRecorder());

    const ctx = makeContext(new StubMessage('m-claimed', false));
    ctx.botConfig = { BOT_ID: 'ThisBot' } as Record<string, unknown>;
    await stage.process(ctx);

    expect(events).toHaveLength(1);
    expect(events[0].shouldReply).toBe(false);
    // The strategy must not even run once the message is already claimed.
    expect(strategy.shouldReply).not.toHaveBeenCalled();
  });
});
