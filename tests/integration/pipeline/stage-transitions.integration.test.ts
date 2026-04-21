import { MessageBus } from '../../../src/events/MessageBus';
import { IMessage } from '../../../src/message/interfaces/IMessage';
import { InferenceStage } from '../../../src/pipeline/InferenceStage';
import { SendStage } from '../../../src/pipeline/SendStage';

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

describe('Pipeline Stage Transitions Integration', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  it('should flow from enriched to inference to response', async () => {
    const mockInvoker = { generateResponse: jest.fn().mockResolvedValue('bot response') };
    const inference = new InferenceStage(bus, mockInvoker as any);
    inference.register();

    const responseSpy = jest.fn();
    bus.on('message:response', responseSpy);

    // Manually trigger the start of this sub-flow
    const message = new TestMessage('hello');
    const context = {
      message,
      botName: 'bot1',
      requestId: 'r1',
      systemPrompt: 'p',
      userPrompt: 'u',
      history: [],
    };

    bus.emit('message:enriched', context as any);

    // Allow async handlers to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockInvoker.generateResponse).toHaveBeenCalled();
    expect(responseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        responseText: 'bot response',
        message: expect.any(TestMessage),
      })
    );
  });

  it('should handle inference errors and emit message:error', async () => {
    const mockInvoker = { generateResponse: jest.fn().mockRejectedValue(new Error('LLM down')) };
    const inference = new InferenceStage(bus, mockInvoker as any);
    inference.register();

    const errorSpy = jest.fn();
    bus.on('message:error', errorSpy);

    const message = new TestMessage('hello');
    const context = {
      message,
      botName: 'bot1',
      requestId: 'r1',
      systemPrompt: 'p',
      userPrompt: 'u',
      history: [],
    };

    bus.emit('message:enriched', context as any);

    // Allow async handlers to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(errorSpy).toHaveBeenCalled();
  });

  it('should flow from response to send and store the response', async () => {
    const mockSender = { sendToChannel: jest.fn().mockImplementation(() => Promise.resolve()) };
    const mockStorer = { storeMemory: jest.fn().mockResolvedValue(undefined) };
    const send = new SendStage(bus, mockSender as any, mockStorer as any);
    send.register();

    const sentSpy = jest.fn();
    bus.on('message:sent', sentSpy);

    const message = new TestMessage('hello');
    const context = {
      message,
      botName: 'bot1',
      requestId: 'r1',
      responseText: 'hi',
      platform: 'test',
      channelId: 'c1',
    };

    // Manually trigger the SendStage (bypass event bus for test)
    await send.process(context as any);

    expect(mockSender.sendToChannel).toHaveBeenCalledWith('c1', 'hi', 'bot1');
    expect(mockStorer.storeMemory).toHaveBeenCalled();
    expect(sentSpy).toHaveBeenCalledWith(expect.objectContaining({
      ...context,
      parts: ['hi'],
    }));
  });

  it('should handle send errors and emit message:error', async () => {
    const mockSender = { send: jest.fn().mockRejectedValue(new Error('Send failed')) };
    const mockStorer = { store: jest.fn().mockResolvedValue(undefined) };
    const send = new SendStage(bus, mockSender as any, mockStorer as any);
    send.register();

    const errorSpy = jest.fn();
    bus.on('message:error', errorSpy);

    const message = new TestMessage('hello');
    const context = {
      message,
      botName: 'bot1',
      requestId: 'r1',
      responseText: 'hi',
    };

    // Manually trigger the SendStage
    await send.process(context as any);

    expect(errorSpy).toHaveBeenCalled();
  });
});