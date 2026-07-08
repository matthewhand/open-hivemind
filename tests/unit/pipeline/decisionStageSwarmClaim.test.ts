/**
 * Regression tests for swarm-claim identity consistency in DecisionStage.
 *
 * Bug: DecisionStage claimed a message via
 *   `swarm.claimMessage(messageId, botName)`
 * (SwarmCoordinator stores `botName` as the claim's `botId`), but the
 * "already claimed?" check compared `existingClaim.botId` against the config
 * `BOT_ID` instead of `botName`. When a bot's `BOT_NAME` differed from its
 * `BOT_ID`, the bot failed to recognize its OWN claim and treated the message
 * as claimed by another bot — causing mis-deduplication in multi-bot swarms.
 *
 * These tests assert the read-side comparison now uses the same identity key
 * (`botName`) as the write-side claim.
 */

import { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '@src/events/MessageBus';
import type { ActivityRecorder } from '@src/pipeline/ActivityRecorder';
import { DecisionStage, type DecisionStrategy } from '@src/pipeline/DecisionStage';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';

// ---------------------------------------------------------------------------
// Stub message
// ---------------------------------------------------------------------------

class StubMessage extends IMessage {
  constructor(private id = 'msg-1') {
    super({}, 'user');
    this.content = 'hello';
    this.channelId = 'ch-swarm';
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
  mentionsUsers(): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return 'Tester';
  }
}

/**
 * Build a MessageContext whose `BOT_NAME` (used for swarm claims) differs from
 * its `BOT_ID` — the exact configuration that triggered the original bug.
 */
function makeContext(message: IMessage) {
  return {
    message,
    history: [],
    botConfig: { BOT_NAME: 'AliceBot', BOT_ID: 'discord-user-id-999' },
    botName: 'AliceBot',
    platform: 'discord',
    channelId: message.getChannelId(),
    metadata: {} as Record<string, any>,
  };
}

function noopRecorder(): ActivityRecorder {
  return {
    recordInteraction: jest.fn(),
    recordBotResponse: jest.fn(),
  };
}

describe('DecisionStage swarm-claim identity consistency', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    SwarmCoordinator.resetInstance();
  });

  afterEach(() => {
    bus.reset();
    SwarmCoordinator.resetInstance();
  });

  it('stores the swarm claim keyed by botName (not config BOT_ID)', async () => {
    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({ shouldReply: true, reason: 'yes' }),
    };
    const stage = new DecisionStage(bus, strategy, noopRecorder());

    await stage.process(makeContext(new StubMessage('m-claim')));

    const claim = SwarmCoordinator.getInstance().getClaim('m-claim');
    expect(claim).toBeDefined();
    // The claim must be keyed by botName, since that is what the read-side
    // de-dup check compares against.
    expect(claim?.botId).toBe('AliceBot');
  });

  it('recognizes its OWN claim on re-processing and does NOT skip (BOT_NAME != BOT_ID)', async () => {
    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({ shouldReply: true, reason: 'yes' }),
    };
    const stage = new DecisionStage(bus, strategy, noopRecorder());

    const skipped: string[] = [];
    bus.on('message:skipped', (ctx: any) => skipped.push(ctx.reason));

    // First pass claims the message for AliceBot.
    const first = await stage.process(makeContext(new StubMessage('m-self')));
    expect(first.shouldReply).toBe(true);

    // Second pass (same bot, same message) must recognize its own claim and
    // run the strategy again — NOT be skipped as "claimed by another bot".
    const second = await stage.process(makeContext(new StubMessage('m-self')));

    expect(second.shouldReply).toBe(true);
    expect(skipped).toHaveLength(0);
    // Strategy ran on both passes (would be short-circuited if mis-deduplicated).
    expect(strategy.shouldReply as jest.Mock).toHaveBeenCalledTimes(2);
  });

  it('still skips when a DIFFERENT bot already claimed the message', async () => {
    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({ shouldReply: true, reason: 'yes' }),
    };

    // A different bot (BobBot) claims the message first.
    SwarmCoordinator.getInstance().claimMessage('m-other', 'BobBot');

    const stage = new DecisionStage(bus, strategy, noopRecorder());

    const skipped: string[] = [];
    bus.on('message:skipped', (ctx: any) => skipped.push(ctx.reason));

    const result = await stage.process(makeContext(new StubMessage('m-other')));

    expect(result.shouldReply).toBe(false);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]).toContain('BobBot');
    // The strategy should never run — the message was de-duplicated.
    expect(strategy.shouldReply).not.toHaveBeenCalled();
  });
});
