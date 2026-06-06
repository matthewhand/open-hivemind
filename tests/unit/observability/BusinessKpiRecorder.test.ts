import type { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '../../../src/events/MessageBus';
import type { MessageContext } from '../../../src/events/types';
import { BusinessKpiCollector } from '../../../src/monitoring/BusinessKpiCollector';
import { BusinessKpiRecorder } from '../../../src/observability/BusinessKpiRecorder';

function makeMessage(authorId: string): IMessage {
  return {
    getText: () => 'hello',
    getMessageId: () => 'msg-1',
    getChannelId: () => 'chan-1',
    getAuthorId: () => authorId,
  } as unknown as IMessage;
}

function makeContext(authorId = 'user-1', receivedAt?: number): MessageContext {
  return {
    message: makeMessage(authorId),
    history: [],
    botConfig: { BOT_NAME: 'TestBot', LLM_PROVIDER: 'openai' },
    botName: 'TestBot',
    platform: 'discord',
    channelId: 'chan-1',
    metadata: receivedAt ? { receive: { receivedAt } } : {},
  };
}

describe('BusinessKpiRecorder', () => {
  let bus: MessageBus;
  let collector: BusinessKpiCollector;

  beforeEach(() => {
    bus = MessageBus.getInstance();
    bus.reset();
    bus = MessageBus.getInstance();
    collector = BusinessKpiCollector.getInstance();
    collector.resetAllKpis();
  });

  afterEach(() => {
    bus.reset();
    collector.resetAllKpis();
  });

  it('feeds total_interactions and daily_active_users from inbound messages', () => {
    new BusinessKpiRecorder(bus, collector).register();

    bus.emit('message:incoming', makeContext('user-1'));
    bus.emit('message:incoming', makeContext('user-2'));
    bus.emit('message:incoming', makeContext('user-1')); // repeat user

    expect(collector.getKpi('total_interactions')!.currentValue).toBe(3);
    // Two unique users seen.
    expect(collector.getKpi('daily_active_users')!.currentValue).toBe(2);
    // messages_per_user = interactions / active users = 3 / 2.
    expect(collector.getKpi('messages_per_user')!.currentValue).toBeCloseTo(1.5);
  });

  it('records average_response_time from the receive timestamp on sent', () => {
    new BusinessKpiRecorder(bus, collector).register();

    const receivedAt = Date.now() - 250;
    const ctx = makeContext('user-1', receivedAt);
    bus.emit('message:sent', { ...ctx, responseText: 'answer', parts: ['answer'] });

    const rt = collector.getKpi('average_response_time')!.currentValue;
    expect(rt).toBeGreaterThanOrEqual(250);
  });

  it('tracks request_success_rate across sent and error events', () => {
    new BusinessKpiRecorder(bus, collector).register();

    const ctx = makeContext('user-1', Date.now());
    bus.emit('message:sent', { ...ctx, responseText: 'a', parts: ['a'] });
    bus.emit('message:sent', { ...ctx, responseText: 'b', parts: ['b'] });
    bus.emit('message:sent', { ...ctx, responseText: 'c', parts: ['c'] });
    bus.emit('message:error', { ...ctx, error: new Error('boom'), stage: 'inference' });

    // 3 successes out of 4 total = 75%.
    expect(collector.getKpi('request_success_rate')!.currentValue).toBeCloseTo(75);
  });

  it('ignores unknown author ids when counting active users', () => {
    new BusinessKpiRecorder(bus, collector).register();

    const ctx = makeContext('user-1');
    // Force the author id helper to return "unknown".
    (ctx.message as unknown as { getAuthorId: () => string }).getAuthorId = () => 'unknown';
    bus.emit('message:incoming', ctx);

    expect(collector.getKpi('total_interactions')!.currentValue).toBe(1);
    expect(collector.getKpi('daily_active_users')!.currentValue).toBe(0);
  });

  it('never throws if the collector sink fails', () => {
    const throwing = {
      recordKpiValue: jest.fn(() => {
        throw new Error('boom');
      }),
    } as unknown as BusinessKpiCollector;
    new BusinessKpiRecorder(bus, throwing).register();

    expect(() => bus.emit('message:incoming', makeContext('user-1'))).not.toThrow();
    expect(throwing.recordKpiValue as jest.Mock).toHaveBeenCalled();
  });
});
