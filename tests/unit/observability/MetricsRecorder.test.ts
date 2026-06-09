/**
 * Tests for MetricsRecorder — the bridge between real pipeline events and the
 * global MetricsCollector.
 *
 * Before this recorder existed, `MetricsCollector.incrementMessages()` and
 * `recordResponseTime()` were only called by the demo-mode activity simulator,
 * so `hivemind_messages_total` / `hivemind_response_time_ms` stayed at zero
 * for real traffic.
 */

import type { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '../../../src/events/MessageBus';
import type { MessageContext } from '../../../src/events/types';
import { MetricsCollector } from '../../../src/monitoring/MetricsCollector';
import { MetricsRecorder } from '../../../src/observability/MetricsRecorder';

function makeMessage(): IMessage {
  return {
    getText: () => 'hello',
    getMessageId: () => 'msg-1',
    getChannelId: () => 'chan-1',
    getAuthorId: () => 'user-1',
  } as unknown as IMessage;
}

function makeContext(metadata: Record<string, unknown> = {}): MessageContext {
  return {
    message: makeMessage(),
    history: [],
    botConfig: { BOT_NAME: 'TestBot' },
    botName: 'TestBot',
    platform: 'discord',
    channelId: 'chan-1',
    metadata,
  };
}

describe('MetricsRecorder', () => {
  let bus: MessageBus;
  let collector: MetricsCollector;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    collector = MetricsCollector.getInstance();
    collector.reset();
  });

  afterEach(() => {
    bus.reset();
    collector.reset();
  });

  it('increments messagesProcessed on message:incoming', () => {
    new MetricsRecorder(bus, collector).register();

    bus.emit('message:incoming', makeContext());
    bus.emit('message:incoming', makeContext());

    expect(collector.getMetrics().messagesProcessed).toBe(2);
  });

  it('increments messagesProcessed on message:sent', () => {
    new MetricsRecorder(bus, collector).register();

    const ctx = makeContext();
    bus.emit('message:sent', { ...ctx, responseText: 'answer', parts: ['answer'] });

    expect(collector.getMetrics().messagesProcessed).toBe(1);
  });

  it('records the inference duration as response time on message:response', () => {
    new MetricsRecorder(bus, collector).register();

    const ctx = makeContext({ inference: { durationMs: 321, status: 'ok' } });
    bus.emit('message:response', { ...ctx, responseText: 'answer' });

    expect(collector.getMetrics().responseTime).toEqual([321]);
  });

  it('does NOT record a response time when inference metadata is missing', () => {
    new MetricsRecorder(bus, collector).register();

    const ctx = makeContext(); // no metadata.inference
    bus.emit('message:response', { ...ctx, responseText: 'answer' });

    expect(collector.getMetrics().responseTime).toEqual([]);
  });

  it('does NOT record non-finite or negative durations', () => {
    new MetricsRecorder(bus, collector).register();

    for (const durationMs of [NaN, Infinity, -5]) {
      const ctx = makeContext({ inference: { durationMs } });
      bus.emit('message:response', { ...ctx, responseText: 'answer' });
    }

    expect(collector.getMetrics().responseTime).toEqual([]);
  });

  it('counts a full receive -> respond -> send round trip as 2 messages + 1 timing', () => {
    new MetricsRecorder(bus, collector).register();

    const ctx = makeContext({ inference: { durationMs: 150 } });
    bus.emit('message:incoming', ctx);
    bus.emit('message:response', { ...ctx, responseText: 'answer' });
    bus.emit('message:sent', { ...ctx, responseText: 'answer', parts: ['answer'] });

    const metrics = collector.getMetrics();
    expect(metrics.messagesProcessed).toBe(2);
    expect(metrics.responseTime).toEqual([150]);
  });

  it('never throws if the collector sink fails', () => {
    const throwing = {
      incrementMessages: jest.fn(() => {
        throw new Error('boom');
      }),
      recordResponseTime: jest.fn(() => {
        throw new Error('boom');
      }),
    } as unknown as MetricsCollector;
    new MetricsRecorder(bus, throwing).register();

    const ctx = makeContext({ inference: { durationMs: 100 } });
    expect(() => bus.emit('message:incoming', ctx)).not.toThrow();
    expect(() => bus.emit('message:response', { ...ctx, responseText: 'a' })).not.toThrow();
    expect(throwing.incrementMessages as jest.Mock).toHaveBeenCalled();
    expect(throwing.recordResponseTime as jest.Mock).toHaveBeenCalled();
  });
});
