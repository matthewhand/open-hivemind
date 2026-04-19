import 'reflect-metadata';
import { MessageBus } from '../../../src/events/MessageBus';
import { createPipeline } from '../../../src/pipeline/createPipeline';
import { IMessage } from '../../../src/message/interfaces/IMessage';
import { IMessengerService } from '../../../src/message/interfaces/IMessengerService';
import { LlmInvokerAdapter } from '../../../src/pipeline/adapters/LlmInvokerAdapter';
import { DecisionStrategyAdapter } from '../../../src/pipeline/adapters/DecisionStrategyAdapter';

// Extend IMessage for test
class TestMessage extends IMessage {
  constructor(public text: string) {
    super({}, 'user');
    this.content = text;
    this.channelId = 'c1';
    this.platform = 'test';
  }
  getMessageId() { return 'm1'; }
  getText() { return this.text; }
  getTimestamp() { return new Date(); }
  getChannelId() { return 'c1'; }
  getAuthorId() { return 'u1'; }
  setText(t: string) { this.text = t; this.content = t; }
}

describe('Message Pipeline Integration', () => {
  let bus: MessageBus;
  let mockMessenger: jest.Mocked<IMessengerService>;

  beforeEach(() => {
    bus = MessageBus.getInstance();
    bus.reset();
    bus = MessageBus.getInstance();
    
    mockMessenger = {
      initialize: jest.fn(),
      sendMessageToChannel: jest.fn().mockResolvedValue(undefined),
      getMessagesFromChannel: jest.fn().mockResolvedValue([]),
      sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
      getClientId: jest.fn().mockReturnValue('bot123'),
      getDefaultChannel: jest.fn().mockReturnValue('general'),
      shutdown: jest.fn(),
      setMessageHandler: jest.fn(),
    } as any;

    // Create the pipeline
    createPipeline(bus, {
      botId: 'bot123',
      botConfig: { name: 'TestBot' },
      messengerService: mockMessenger,
    });
  });

  it('should process an incoming message through the pipeline and send a reply', async () => {
    // 1. Mock dependencies that adapters use
    jest.spyOn(LlmInvokerAdapter.prototype, 'generateResponse').mockResolvedValue('Hello from AI!');
    jest.spyOn(DecisionStrategyAdapter.prototype, 'shouldReply').mockResolvedValue({
      shouldReply: true,
      reason: 'Test force reply'
    });

    // 2. Listen for completion
    const sentSpy = jest.fn();
    bus.on('message:sent', sentSpy);

    // 3. Trigger the pipeline
    const message = new TestMessage('Hi bot');
    const context: any = {
      message,
      botName: 'TestBot',
      botConfig: { name: 'TestBot' },
      requestId: 'req123',
      history: [],
      metadata: {}
    };

    // Use emitAsync to wait for all stages
    await bus.emitAsync('message:incoming', context);

    // 5. Verify
    expect(sentSpy).toHaveBeenCalled();
    expect(mockMessenger.sendMessageToChannel).toHaveBeenCalledWith(
      'c1',
      'Hello from AI!',
      'TestBot'
    );
  });

  it('should skip messages that the decision stage rejects', async () => {
    jest.spyOn(DecisionStrategyAdapter.prototype, 'shouldReply').mockResolvedValue({
      shouldReply: false,
      reason: 'No reply needed'
    });

    const skippedSpy = jest.fn();
    bus.on('message:skipped', skippedSpy);
    const sentSpy = jest.fn();
    bus.on('message:sent', sentSpy);

    const message = new TestMessage('Ignored message');
    await bus.emitAsync('message:incoming', {
      message,
      botName: 'TestBot',
      botConfig: { name: 'TestBot' },
      requestId: 'req456',
      history: [],
      metadata: {}
    });

    expect(skippedSpy).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'No reply needed'
    }));
    expect(sentSpy).not.toHaveBeenCalled();
  });
});
