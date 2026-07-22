import { IMessage } from '@hivemind/shared-types';
import { MessageBus } from '@src/events/MessageBus';
import { SendStage } from '@src/pipeline/SendStage';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';

class StubMessage extends IMessage {
  constructor(
    private id = 'm1',
    private threadId?: string
  ) {
    super(threadId ? { thread_ts: threadId } : {}, 'user');
    this.content = 'hi';
    this.channelId = 'ch';
    this.platform = 'slack';
    if (threadId) this.metadata = { threadId };
  }
  getMessageId() {
    return this.id;
  }
  getText() {
    return this.content;
  }
  getTimestamp() {
    return new Date();
  }
  setText(t: string) {
    this.content = t;
  }
  getChannelId() {
    return this.channelId;
  }
  getAuthorId() {
    return 'u';
  }
  getChannelTopic() {
    return null;
  }
  getUserMentions() {
    return [];
  }
  getChannelUsers() {
    return [];
  }
  mentionsUsers() {
    return false;
  }
  isFromBot() {
    return false;
  }
  getAuthorName() {
    return 'T';
  }
}

function ctx(message: IMessage, responseText: string, botConfig: Record<string, unknown> = {}) {
  return {
    message,
    history: [],
    botConfig,
    botName: 'TestBot',
    platform: 'slack',
    channelId: message.getChannelId(),
    metadata: {} as Record<string, any>,
    responseText,
  };
}

describe('SendStage thread + release', () => {
  let bus: MessageBus;
  beforeEach(() => {
    MessageBus.getInstance().reset();
    bus = MessageBus.getInstance();
    SwarmCoordinator.resetInstance();
  });
  afterEach(() => {
    bus.reset();
    SwarmCoordinator.resetInstance();
  });

  it('passes thread/reply options', async () => {
    const sendToChannel = jest.fn().mockResolvedValue(undefined);
    await new SendStage(bus, { sendToChannel }).process(
      ctx(new StubMessage('msg-99', 'thread-abc'), 'body', { MESSAGE_REPLY_IN_THREAD: true })
    );
    expect(sendToChannel).toHaveBeenCalledWith(
      'ch',
      'body',
      'TestBot',
      expect.objectContaining({
        threadId: 'thread-abc',
        replyToMessageId: 'msg-99',
        platform: 'slack',
      })
    );
  });

  it('prefers MESSAGE_PROVIDER over empty/generic ctx.platform for multi-provider routing', async () => {
    const sendToChannel = jest.fn().mockResolvedValue(undefined);
    const message = new StubMessage('msg-mp');
    const context = {
      message,
      history: [],
      botConfig: { MESSAGE_PROVIDER: 'discord' },
      botName: 'TestBot',
      // Empty / generic platform must NOT win over bot config
      platform: 'generic',
      channelId: message.getChannelId(),
      metadata: {} as Record<string, any>,
      responseText: 'hi',
    };
    await new SendStage(bus, { sendToChannel }).process(context as any);
    expect(sendToChannel).toHaveBeenCalledWith(
      'ch',
      'hi',
      'TestBot',
      expect.objectContaining({ platform: 'discord' })
    );
  });

  it('releases claim on empty and on error', async () => {
    SwarmCoordinator.getInstance().claimMessage('empty', 'TestBot');
    await new SendStage(bus, { sendToChannel: jest.fn() }).process(
      ctx(new StubMessage('empty'), '  ')
    );
    expect(SwarmCoordinator.getInstance().getClaim('empty')).toBeUndefined();

    SwarmCoordinator.getInstance().claimMessage('err', 'TestBot');
    await new SendStage(bus, {
      sendToChannel: jest.fn().mockRejectedValue(new Error('fail')),
    }).process(ctx(new StubMessage('err'), 'ok'));
    expect(SwarmCoordinator.getInstance().getClaim('err')).toBeUndefined();
  });
});
