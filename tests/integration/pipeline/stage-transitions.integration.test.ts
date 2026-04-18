import { MessageBus } from '../../../src/events/MessageBus';
import { InferenceStage } from '../../../src/pipeline/InferenceStage';
import { SendStage } from '../../../src/pipeline/SendStage';
import { IMessage } from '../../../src/message/interfaces/IMessage';

class TestMessage extends IMessage {
  constructor(public text: string) { super({}, 'user'); this.content = text; this.channelId = 'c1'; this.platform = 'test'; }
  getMessageId() { return 'm1'; }
  getText() { return this.text; }
  getTimestamp() { return new Date(); }
  getChannelId() { return 'c1'; }
  getAuthorId() { return 'u1'; }
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
    const context = { message, botName: 'bot1', requestId: 'r1', systemPrompt: 'p', userPrompt: 'u', history: [] };
    
    bus.emit('message:enriched', context as any);

    // Allow async handlers to run
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockInvoker.generateResponse).toHaveBeenCalled();
    expect(responseSpy).toHaveBeenCalledWith(expect.objectContaining({
      responseText: 'bot response'
    }));
  });

  it('should flow from response to send', async () => {
    const mockSender = { send: jest.fn().mockResolvedValue(undefined) };
    const mockStorer = { store: jest.fn().mockResolvedValue(undefined) };
    const send = new SendStage(bus, mockSender as any, mockStorer as any);
    send.register();
    
    const sentSpy = jest.fn();
    bus.on('message:sent', sentSpy);

    const message = new TestMessage('hello');
    const context = { message, botName: 'bot1', requestId: 'r1', responseText: 'hi' };
    
    bus.emit('message:response', context as any);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockSender.send).toHaveBeenCalled();
    expect(mockStorer.store).toHaveBeenCalled();
    expect(sentSpy).toHaveBeenCalled();
  });
});
