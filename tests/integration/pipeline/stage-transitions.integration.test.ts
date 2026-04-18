import { MessageBus } from '../../../src/events/MessageBus';
import { IMessage } from '../../../src/message/interfaces/IMessage';
import { EnrichStage } from '../../../src/pipeline/EnrichStage';
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
    const mockInvoker = { invoke: jest.fn().mockResolvedValue('bot response') };
    const inference = new InferenceStage(bus, mockInvoker as any);

    const responseSpy = jest.fn();
    bus.on('message:response', responseSpy);

    // Manually trigger the start of this sub-flow
    const message = new TestMessage('hello');
    const context = { message, botName: 'bot1', requestId: 'r1' };

    bus.emit('message:enriched', { ...context, systemPrompt: 'p', userPrompt: 'u' });

    // Allow async handlers to run
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockInvoker.invoke).toHaveBeenCalled();
    expect(responseSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        responseText: 'bot response',
      })
    );
  });

  it('should flow from response to send', async () => {
    const mockSender = { send: jest.fn().mockResolvedValue(undefined) };
    const mockStorer = { store: jest.fn().mockResolvedValue(undefined) };
    const send = new SendStage(bus, mockSender as any, mockStorer as any);

    const sentSpy = jest.fn();
    bus.on('message:sent', sentSpy);

    const message = new TestMessage('hello');
    const context = { message, botName: 'bot1', requestId: 'r1', responseText: 'hi' };

    bus.emit('message:response', context);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockSender.send).toHaveBeenCalled();
    expect(mockStorer.store).toHaveBeenCalled();
    expect(sentSpy).toHaveBeenCalled();
  });
});
