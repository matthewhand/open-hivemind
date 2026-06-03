import { ActivityRecorder } from '../../../src/observability/ActivityRecorder';
import { MessageBus } from '../../../src/events/MessageBus';
import type { MessageContext } from '../../../src/events/types';
import type { IMessage } from '../../../src/message/interfaces/IMessage';

function makeMessage(text: string, opts: { channelId?: string; authorId?: string } = {}): IMessage {
  return {
    getText: () => text,
    getMessageId: () => 'msg-1',
    getChannelId: () => opts.channelId ?? 'chan-1',
    getAuthorId: () => opts.authorId ?? 'user-1',
  } as unknown as IMessage;
}

function makeContext(text = 'hello'): MessageContext {
  return {
    message: makeMessage(text),
    history: [],
    botConfig: { BOT_NAME: 'TestBot', LLM_PROVIDER: 'openai' },
    botName: 'TestBot',
    platform: 'discord',
    channelId: 'chan-1',
    metadata: { receive: { receivedAt: Date.now() } },
  };
}

describe('ActivityRecorder', () => {
  let bus: MessageBus;
  let mockLogger: { log: jest.Mock };
  let mockFlowSink: { recordMessageFlow: jest.Mock };

  beforeEach(() => {
    bus = MessageBus.getInstance();
    bus.reset();
    bus = MessageBus.getInstance();
    mockLogger = { log: jest.fn() };
    mockFlowSink = { recordMessageFlow: jest.fn() };
  });

  afterEach(() => {
    bus.reset();
  });

  it('records an incoming MessageFlowEvent when a real message enters the pipeline', () => {
    const recorder = new ActivityRecorder(bus, mockLogger as any, mockFlowSink as any);
    recorder.register();

    bus.emit('message:incoming', makeContext('hi there'));

    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    const event = mockLogger.log.mock.calls[0][0];
    expect(event).toMatchObject({
      botName: 'TestBot',
      provider: 'discord',
      llmProvider: 'openai',
      channelId: 'chan-1',
      userId: 'user-1',
      messageType: 'incoming',
      status: 'success',
      contentLength: 'hi there'.length,
    });
    expect(typeof event.id).toBe('string');
    expect(typeof event.timestamp).toBe('string');

    // Live feed is also notified (without id/timestamp, which it assigns itself).
    expect(mockFlowSink.recordMessageFlow).toHaveBeenCalledTimes(1);
    const flow = mockFlowSink.recordMessageFlow.mock.calls[0][0];
    expect(flow).not.toHaveProperty('id');
    expect(flow).not.toHaveProperty('timestamp');
    expect(flow).toMatchObject({ messageType: 'incoming', botName: 'TestBot' });
  });

  it('records an outgoing success event when a response is sent', () => {
    const recorder = new ActivityRecorder(bus, mockLogger as any, mockFlowSink as any);
    recorder.register();

    const ctx = makeContext();
    bus.emit('message:sent', { ...ctx, responseText: 'the answer', parts: ['the answer'] });

    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    const event = mockLogger.log.mock.calls[0][0];
    expect(event).toMatchObject({
      messageType: 'outgoing',
      status: 'success',
      contentLength: 'the answer'.length,
    });
    expect(typeof event.processingTime).toBe('number');
  });

  it('records an outgoing error event when the pipeline errors', () => {
    const recorder = new ActivityRecorder(bus, mockLogger as any, mockFlowSink as any);
    recorder.register();

    const ctx = makeContext();
    bus.emit('message:error', { ...ctx, error: new Error('boom'), stage: 'inference' });

    expect(mockLogger.log).toHaveBeenCalledTimes(1);
    const event = mockLogger.log.mock.calls[0][0];
    expect(event).toMatchObject({
      messageType: 'outgoing',
      status: 'error',
      errorMessage: 'boom',
    });
  });

  it('never throws if the logger sink fails', () => {
    const throwingLogger = {
      log: jest.fn(() => {
        throw new Error('disk full');
      }),
    };
    const recorder = new ActivityRecorder(bus, throwingLogger as any);
    recorder.register();

    expect(() => bus.emit('message:incoming', makeContext())).not.toThrow();
    expect(throwingLogger.log).toHaveBeenCalledTimes(1);
  });
});
