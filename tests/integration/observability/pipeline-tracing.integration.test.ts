import { MessageBus } from '../../../src/events/MessageBus';
import { IMessage } from '../../../src/message/interfaces/IMessage';
import { PipelineTracer } from '../../../src/observability/PipelineTracer';

class TestMessage extends IMessage {
  constructor(public text: string) {
    super({}, 'user');
    this.content = text;
    this.channelId = 'c1';
    this.platform = 'test';
  }
  getMessageId() {
    return 'm1';
  }
  getText() {
    return this.text;
  }
  getTimestamp() {
    return new Date();
  }
  getChannelId() {
    return 'c1';
  }
  getAuthorId() {
    return 'u1';
  }
}

describe('PipelineTracer Integration', () => {
  let bus: MessageBus;
  let tracer: PipelineTracer;

  beforeEach(() => {
    bus = new MessageBus();
    tracer = new PipelineTracer(bus);
    tracer.register();
  });

  it('should create a trace when a message flow starts and finishes', async () => {
    const message = new TestMessage('hello');
    const context = {
      message,
      botName: 'bot1',
      requestId: 'r1',
      channelId: 'c1',
      platform: 'test',
    };

    // Simulate pipeline stages
    bus.emit('message:incoming', context);

    // Some "work"
    await new Promise((resolve) => setTimeout(resolve, 10));

    bus.emit('message:enriched', { ...context, systemPrompt: 'p', userPrompt: 'u' });

    await new Promise((resolve) => setTimeout(resolve, 10));

    bus.emit('message:response', { ...context, responseText: 'hi' });

    await new Promise((resolve) => setTimeout(resolve, 10));

    bus.emit('message:sent', { ...context, responseText: 'hi' });

    const stats = tracer.getStats();
    expect(stats.totalTraces).toBe(1);
    expect(stats.avgDurationMs).toBeGreaterThan(0);

    const traces = tracer.getCompletedTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0].spans.length).toBeGreaterThanOrEqual(1);
  });

  it('should record errors in spans', async () => {
    const message = new TestMessage('fail');
    const context = {
      message,
      botName: 'bot1',
      requestId: 'r2',
      channelId: 'c1',
      platform: 'test',
    };

    bus.emit('message:incoming', context);
    bus.emit('message:error', { ...context, error: new Error('boom'), stage: 'inference' });

    const stats = tracer.getStats();
    expect(stats.errorRate).toBe(1);

    const traces = tracer.getCompletedTraces();
    expect(traces[0].rootSpan.status).toBe('error');
  });
});
