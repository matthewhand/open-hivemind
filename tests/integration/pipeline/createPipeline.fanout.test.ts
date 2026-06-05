/**
 * Regression test for the pipeline bus fan-out bug.
 *
 * `createPipeline()` wires the 5 pipeline stages (+ tracer) onto a shared,
 * singleton {@link MessageBus}. The stages subscribe to bus-wide events
 * (`message:incoming`, `message:validated`, …) that carry no per-service
 * identity. Bootstrapping previously called `createPipeline(bus, …)` once per
 * messenger service, which added duplicate listeners to the singleton bus and
 * caused a single incoming message to be processed (and sent) N times.
 *
 * These tests prove registration is idempotent per bus instance: with N
 * services, each event has exactly one listener and a single message is
 * processed exactly once.
 */

import { MessageBus } from '@src/events/MessageBus';
import { createPipeline } from '@src/pipeline/createPipeline';
import { ReceiveStage } from '@src/pipeline/ReceiveStage';
import type { IMessengerService } from '@hivemind/shared-types';
import { IMessage } from '@hivemind/shared-types';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

function createStubService(channelId: string, botId: string): IMessengerService {
  const sendMessageToChannel = jest.fn().mockResolvedValue('sent-id');
  return {
    botId,
    initialize: jest.fn().mockResolvedValue(undefined),
    sendMessageToChannel,
    getMessagesFromChannel: jest.fn().mockResolvedValue([]),
    sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    getClientId: () => botId,
    getDefaultChannel: () => channelId,
    shutdown: jest.fn().mockResolvedValue(undefined),
    setMessageHandler: jest.fn(),
  } as unknown as IMessengerService;
}

class StubMessage extends IMessage {
  private text: string;
  constructor(text = 'hello') {
    super({}, 'user');
    this.text = text;
    this.content = text;
    this.channelId = 'ch-fanout';
    this.platform = 'test';
  }
  getMessageId(): string {
    return 'msg-fanout';
  }
  getText(): string {
    return this.text;
  }
  getTimestamp(): Date {
    return new Date();
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
  mentionsUsers(): boolean {
    return false;
  }
  isFromBot(): boolean {
    return false;
  }
  getAuthorName(): string {
    return 'FanoutUser';
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const PIPELINE_EVENTS = [
  'message:incoming',
  'message:validated',
  'message:accepted',
  'message:skipped',
  'message:enriched',
  'message:response',
  'message:sent',
  'message:error',
] as const;

describe('createPipeline — bus fan-out', () => {
  let bus: MessageBus;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
  });

  afterEach(() => {
    bus.reset();
    jest.restoreAllMocks();
  });

  it('registers the pipeline exactly once even when called per service', () => {
    // Baseline: a single registration on a fresh bus.
    const baselineBus = MessageBus.getInstance();
    createPipeline(baselineBus, {
      botConfig: {},
      messengerService: createStubService('ch-base', 'bot-base'),
      botId: 'bot-base',
      defaultChannelId: 'ch-base',
    });
    const baseline = Object.fromEntries(
      PIPELINE_EVENTS.map((event) => [event, baselineBus.listenerCount(event as any)])
    );
    baselineBus.reset();

    // Now register once per service on a fresh shared bus.
    const multiBus = MessageBus.getInstance();
    const services = [
      createStubService('ch-a', 'bot-a'),
      createStubService('ch-b', 'bot-b'),
      createStubService('ch-c', 'bot-c'),
    ];
    const results = services.map((messengerService) =>
      createPipeline(multiBus, {
        botConfig: {},
        messengerService,
        botId: messengerService.botId,
        defaultChannelId: messengerService.getDefaultChannel(),
      })
    );

    // Only the first call wires the pipeline; the rest are no-ops.
    expect(results).toEqual([true, false, false]);

    // Listener counts must match the single-registration baseline exactly —
    // no N-fold duplication regardless of how many services were registered.
    for (const event of PIPELINE_EVENTS) {
      expect(multiBus.listenerCount(event as any)).toBe(baseline[event]);
    }

    multiBus.reset();
  });

  it('processes a single incoming message exactly once with multiple services', async () => {
    const processSpy = jest.spyOn(ReceiveStage.prototype, 'process');

    const services = [
      createStubService('ch-a', 'bot-a'),
      createStubService('ch-b', 'bot-b'),
      createStubService('ch-c', 'bot-c'),
    ];
    for (const messengerService of services) {
      createPipeline(bus, {
        botConfig: {},
        messengerService,
        botId: messengerService.botId,
        defaultChannelId: messengerService.getDefaultChannel(),
      });
    }

    await bus.emitAsync('message:incoming', {
      message: new StubMessage('hello world'),
      history: [],
      botConfig: { BOT_NAME: 'FanoutBot' },
      botName: 'FanoutBot',
      platform: 'test',
      channelId: 'ch-fanout',
      metadata: {},
    });

    // ReceiveStage.process must fire once, not once-per-service.
    expect(processSpy).toHaveBeenCalledTimes(1);
  });
});
