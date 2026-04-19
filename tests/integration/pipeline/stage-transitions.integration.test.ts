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
    const context = { message, botName: 'bot1', requestId: 'r1', history: [] };
    
    bus.emit('message:enriched', { ...context, systemPrompt: 'p', memories: [] });

    // Allow async handlers to run
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockInvoker.generateResponse).toHaveBeenCalled();
    expect(responseSpy).toHaveBeenCalledWith(expect.objectContaining({
      responseText: 'bot response'
    }));
  });

  it('should flow from response to send', async () => {
    const mockSender = { sendToChannel: jest.fn().mockResolvedValue(undefined) };
    const mockStorer = { storeMemory: jest.fn().mockResolvedValue(undefined) };
    const send = new SendStage(bus, mockSender as any, mockStorer as any);
    send.register();
    
    const sentSpy = jest.fn();
    bus.on('message:sent', sentSpy);

    const message = new TestMessage('hello');
    const context = { message, botName: 'bot1', requestId: 'r1', responseText: 'hi', channelId: 'c1' };
    
    bus.emit('message:response', context);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockSender.sendToChannel).toHaveBeenCalled();
    expect(mockStorer.storeMemory).toHaveBeenCalled();
    expect(sentSpy).toHaveBeenCalled();
  });
});
