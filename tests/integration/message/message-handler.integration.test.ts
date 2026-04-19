import { handleMessage } from '../../../src/message/handlers/messageHandler';
import { IMessage } from '../../../src/message/interfaces/IMessage';
import { MessageBus } from '../../../src/events/MessageBus';

// Extend IMessage to create a concrete test message
class TestMessage extends IMessage {
  constructor(public text: string, public isUnsolicited = false) {
    super({}, 'user');
    this.content = text;
    this.channelId = 'test-channel';
    this.platform = 'test-platform';
  }
  getMessageId() { return 'test-msg-id'; }
  getText() { return this.text; }
  getTimestamp() { return new Date(); }
  getChannelId() { return 'test-channel'; }
  getAuthorId() { return 'test-user'; }
}

describe('Message Handler Integration', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
    jest.spyOn(MessageBus, 'getInstance').mockReturnValue(bus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should emit message:incoming when a valid message is processed', async () => {
    const incomingSpy = jest.fn();
    bus.on('message:incoming', incomingSpy);

    const message = new TestMessage('Hello, bot!');
    const botConfig = { name: 'TestBot' };

    await handleMessage(message, [], botConfig as any);

    expect(incomingSpy).toHaveBeenCalled();
    const callArgs = incomingSpy.mock.calls[0][0];
    expect(callArgs.message.getText()).toBe('Hello, bot!');
    expect(callArgs.botName).toBe('TestBot');
  });

  it('should not emit message:incoming for empty messages', async () => {
    const incomingSpy = jest.fn();
    bus.on('message:incoming', incomingSpy);

    const message = new TestMessage('');
    const botConfig = { name: 'TestBot' };

    await handleMessage(message, botConfig as any);

    expect(incomingSpy).not.toHaveBeenCalled();
  });
});
