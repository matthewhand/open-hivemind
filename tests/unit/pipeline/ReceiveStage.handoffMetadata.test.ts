/**
 * Handoff metadata must survive ReceiveStage re-entry so transfer_to_bot hop limits work.
 */

import type { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '../../../src/events/MessageBus';
import { ReceiveStage } from '../../../src/pipeline/ReceiveStage';

class StubMessage {
  platform = 'discord';
  constructor(
    private text = 'hello specialist',
    private channelId = 'ch-1'
  ) {}
  getText(): string {
    return this.text;
  }
  setText(t: string): void {
    this.text = t;
  }
  getChannelId(): string {
    return this.channelId;
  }
  getMessageId(): string {
    return 'msg-1';
  }
  getAuthorId(): string {
    return 'user-1';
  }
  getAuthorName(): string {
    return 'User';
  }
  isFromBot(): boolean {
    return false;
  }
  isReplyToBot(): boolean {
    return false;
  }
  mentionsUsers(): boolean {
    return false;
  }
  getUserMentions(): string[] {
    return [];
  }
  getChannelUsers(): string[] {
    return [];
  }
  getChannelTopic(): string | null {
    return null;
  }
  getTimestamp(): Date {
    return new Date();
  }
}

describe('ReceiveStage handoff metadata', () => {
  let bus: MessageBus;
  let stage: ReceiveStage;

  beforeEach(() => {
    bus = MessageBus.getInstance();
    bus.reset();
    stage = new ReceiveStage(bus);
    stage.register();
  });

  afterEach(() => {
    bus.reset();
  });

  it('preserves transferHop and handoff when re-entering via message:incoming', async () => {
    const validated: unknown[] = [];
    bus.on('message:validated', (ctx) => {
      validated.push(ctx);
    });

    const message = new StubMessage() as unknown as IMessage;
    await bus.emitAsync('message:incoming', {
      message,
      history: [],
      botConfig: { name: 'specialist', BOT_NAME: 'specialist' },
      botName: 'specialist',
      platform: 'discord',
      channelId: 'ch-1',
      metadata: {
        transferHop: 2,
        handoff: { from: 'bot-a', to: 'specialist', hop: 2, reason: 'domain', at: 1 },
      },
    });

    // Allow async handler to settle
    await new Promise((r) => setImmediate(r));

    expect(validated).toHaveLength(1);
    const ctx = validated[0] as {
      botName: string;
      metadata: { transferHop?: number; handoff?: { hop: number }; receive?: unknown };
    };
    expect(ctx.botName).toBe('specialist');
    expect(ctx.metadata.transferHop).toBe(2);
    expect(ctx.metadata.handoff?.hop).toBe(2);
    expect(ctx.metadata.receive).toBeDefined();
  });

  it('process(incoming) merges prior metadata when called directly', async () => {
    const message = new StubMessage() as unknown as IMessage;
    const result = await stage.process(
      message,
      [],
      { name: 'bot-b' },
      {
        botName: 'bot-b',
        metadata: { transferHop: 1, handoff: { from: 'a', to: 'b', hop: 1 } },
      }
    );
    expect(result).not.toBeNull();
    expect(result!.metadata.transferHop).toBe(1);
    expect(result!.botName).toBe('bot-b');
  });
});
