/**
 * Regression tests for pipeline activity tracking (fatigue / grace window /
 * idle response).
 *
 * Before the fix, the staged pipeline (DecisionStage + SendStage — the DEFAULT
 * message-processing path) never fed the response-scoring signals:
 *   - GlobalActivityTracker.recordActivity was never called anywhere.
 *   - recordBotActivity (grace window) was only called from the legacy path.
 *   - IdleResponseManager.recordInteraction was only called from legacy
 *     replyDecision.
 *
 * These tests assert the pipeline now wires all three recordings.
 */

import { MessageBus } from '@src/events/MessageBus';
import type { ActivityRecorder } from '@src/pipeline/ActivityRecorder';
import { DefaultActivityRecorder } from '@src/pipeline/ActivityRecorder';
import { DecisionStage, type DecisionStrategy } from '@src/pipeline/DecisionStage';
import { SendStage, type MessageSender } from '@src/pipeline/SendStage';
import { GlobalActivityTracker } from '@src/message/helpers/processing/GlobalActivityTracker';
import {
  clearBotActivity,
  getLastBotActivity,
} from '@src/message/helpers/processing/ChannelActivity';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';
import { IMessage } from '@hivemind/shared-types';

// ---------------------------------------------------------------------------
// Stub message
// ---------------------------------------------------------------------------

class StubMessage extends IMessage {
  constructor(
    private id = 'msg-1',
    private fromBot = false
  ) {
    super({}, fromBot ? 'assistant' : 'user');
    this.content = 'hello';
    this.channelId = 'ch-activity';
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

function createRecorderSpy(): ActivityRecorder & {
  recordInteraction: jest.Mock;
  recordBotResponse: jest.Mock;
} {
  return {
    recordInteraction: jest.fn(),
    recordBotResponse: jest.fn(),
  };
}

describe('pipeline activity tracking', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    SwarmCoordinator.resetInstance();
    GlobalActivityTracker.getInstance().reset();
    clearBotActivity();
  });

  afterEach(() => {
    bus.reset();
  });

  // --- DecisionStage: records inbound interaction (idle response) -----------

  it('DecisionStage records an interaction for human messages', async () => {
    const recorder = createRecorderSpy();
    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({ shouldReply: false, reason: 'no' }),
    };
    const stage = new DecisionStage(bus, strategy, recorder);

    await stage.process(makeContext(new StubMessage('m-human', false)));

    expect(recorder.recordInteraction).toHaveBeenCalledTimes(1);
    expect(recorder.recordInteraction).toHaveBeenCalledWith('discord', 'ch-activity', 'm-human');
  });

  it('DecisionStage does NOT record an interaction for bot-authored messages', async () => {
    const recorder = createRecorderSpy();
    const strategy: DecisionStrategy = {
      shouldReply: jest.fn().mockResolvedValue({ shouldReply: false, reason: 'no' }),
    };
    const stage = new DecisionStage(bus, strategy, recorder);

    await stage.process(makeContext(new StubMessage('m-bot', true)));

    expect(recorder.recordInteraction).not.toHaveBeenCalled();
  });

  // --- SendStage: records bot response (fatigue + grace + idle) -------------

  it('SendStage records a bot response after a successful send', async () => {
    const recorder = createRecorderSpy();
    const sender: MessageSender = { sendToChannel: jest.fn().mockResolvedValue(undefined) };
    const stage = new SendStage(bus, sender, undefined, recorder, 'bot-42');

    const ctx = { ...makeContext(new StubMessage()), responseText: 'a reply' };
    await stage.process(ctx);

    expect(recorder.recordBotResponse).toHaveBeenCalledTimes(1);
    expect(recorder.recordBotResponse).toHaveBeenCalledWith('discord', 'ch-activity', 'bot-42');
  });

  it('SendStage does NOT record when the response is empty', async () => {
    const recorder = createRecorderSpy();
    const sender: MessageSender = { sendToChannel: jest.fn().mockResolvedValue(undefined) };
    const stage = new SendStage(bus, sender, undefined, recorder, 'bot-42');

    const ctx = { ...makeContext(new StubMessage()), responseText: '   ' };
    await stage.process(ctx);

    expect(recorder.recordBotResponse).not.toHaveBeenCalled();
  });

  // --- End-to-end with the REAL recorder: previously-dead signals are live --

  it('DefaultActivityRecorder feeds the global fatigue score and grace window', async () => {
    const sender: MessageSender = { sendToChannel: jest.fn().mockResolvedValue(undefined) };
    const stage = new SendStage(bus, sender, undefined, new DefaultActivityRecorder(), 'bot-99');

    // Pre-condition: no fatigue, no recent activity.
    expect(GlobalActivityTracker.getInstance().getScore('bot-99')).toBe(0);
    expect(getLastBotActivity('ch-activity', 'bot-99')).toBe(0);

    const ctx = { ...makeContext(new StubMessage()), responseText: 'a reply' };
    await stage.process(ctx);

    // Post-condition: fatigue score incremented and grace-window timestamp set.
    expect(GlobalActivityTracker.getInstance().getScore('bot-99')).toBeGreaterThan(0);
    expect(getLastBotActivity('ch-activity', 'bot-99')).toBeGreaterThan(0);
  });
});
