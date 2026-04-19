import { MessageBus } from '../../../src/events/MessageBus';
import { InferenceStage } from '../../../src/pipeline/InferenceStage';
import { IMessage } from '../../../src/message/interfaces/IMessage';

class TestMessage extends IMessage {
  constructor(public text: string) { super({}, 'user'); this.content = text; this.channelId = 'c1'; this.platform = 'test'; }
  getMessageId() { return 'm1'; }
  getText() { return this.text; }
  getTimestamp() { return new Date(); }
  getChannelId() { return 'c1'; }
  getAuthorId() { return 'u1'; }
}

describe('Pipeline Error Propagation Integration', () => {
  let bus: MessageBus;
  
  beforeEach(() => {
    bus = new MessageBus();
  });

  it('should emit message:error when inference fails', async () => {
    const mockInvoker = { generateResponse: jest.fn().mockRejectedValue(new Error('LLM down')) };
    const inference = new InferenceStage(bus, mockInvoker as any);
    inference.register();
    
    const errorSpy = jest.fn();
    bus.on('message:error', errorSpy);

    const message = new TestMessage('hello');
    const context = { message, botName: 'bot1', requestId: 'r1', history: [] };
    
    bus.emit('message:enriched', { ...context, systemPrompt: 'p', memories: [] });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ message: 'LLM down' }),
      stage: 'inference'
    }));
  });
});
