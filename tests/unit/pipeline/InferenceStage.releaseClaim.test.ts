import { IMessage, type IMessengerService } from '@hivemind/shared-types';
import { MessageBus } from '@src/events/MessageBus';
import { MessageSenderAdapter } from '@src/pipeline/adapters/MessageSenderAdapter';
import { InferenceStage } from '@src/pipeline/InferenceStage';
import { SendStage } from '@src/pipeline/SendStage';
import { SwarmCoordinator } from '@src/services/SwarmCoordinator';

jest.mock('@src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: () => ({ logInference: jest.fn().mockResolvedValue(undefined) }),
  },
}));
jest.mock('@src/server/services/TokenBudgetService', () => ({
  TokenBudgetService: {
    getInstance: () => ({
      isOverBudget: () => false,
      incrementUsage: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

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

function sendCtx(message: IMessage, responseText: string, botConfig: Record<string, unknown> = {}) {
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

function infCtx(message: IMessage) {
  return {
    message,
    history: [],
    botConfig: {},
    botName: 'InfBot',
    platform: 'discord',
    channelId: message.getChannelId(),
    metadata: {} as Record<string, any>,
    memories: [] as string[],
    systemPrompt: 'sys',
  };
}

function stubMessenger(name: string) {
  return {
    providerName: name,
    sendMessageToChannel: jest.fn().mockResolvedValue('id'),
  } as unknown as IMessengerService & { sendMessageToChannel: jest.Mock };
}

describe('MessageSenderAdapter multi-provider + thread', () => {
  it('routes by platform and forwards thread args', async () => {
    const slack = stubMessenger('slack');
    const discord = stubMessenger('discord');
    const adapter = new MessageSenderAdapter({
      messengerService: slack,
      messengersByProvider: { slack, discord },
    });
    await adapter.sendToChannel('c', 't', 'b', {
      platform: 'discord',
      threadId: 'th',
      replyToMessageId: 'm1',
    });
    expect(discord.sendMessageToChannel).toHaveBeenCalledWith('c', 't', 'b', 'th', 'm1');
    expect(slack.sendMessageToChannel).not.toHaveBeenCalled();
  });

  it('falls back to primary messenger', async () => {
    const primary = stubMessenger('slack');
    const adapter = new MessageSenderAdapter({ messengerService: primary });
    await adapter.sendToChannel('c', 't', 'b', { platform: 'telegram' });
    expect(primary.sendMessageToChannel).toHaveBeenCalled();
  });
});

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
      sendCtx(new StubMessage('msg-99', 'thread-abc'), 'body', {
        MESSAGE_REPLY_IN_THREAD: true,
      })
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

  it('releases claim on empty and on error', async () => {
    SwarmCoordinator.getInstance().claimMessage('empty', 'TestBot');
    await new SendStage(bus, { sendToChannel: jest.fn() }).process(
      sendCtx(new StubMessage('empty'), '  ')
    );
    expect(SwarmCoordinator.getInstance().getClaim('empty')).toBeUndefined();

    SwarmCoordinator.getInstance().claimMessage('err', 'TestBot');
    await new SendStage(bus, {
      sendToChannel: jest.fn().mockRejectedValue(new Error('fail')),
    }).process(sendCtx(new StubMessage('err'), 'ok'));
    expect(SwarmCoordinator.getInstance().getClaim('err')).toBeUndefined();
  });
});

describe('InferenceStage releaseClaim', () => {
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

  it('releases on empty response', async () => {
    SwarmCoordinator.getInstance().claimMessage('e', 'InfBot');
    await new InferenceStage(bus, {
      generateResponse: jest.fn().mockResolvedValue(''),
    }).process(infCtx(new StubMessage('e')));
    expect(SwarmCoordinator.getInstance().getClaim('e')).toBeUndefined();
  });

  it('releases on error', async () => {
    SwarmCoordinator.getInstance().claimMessage('x', 'InfBot');
    await new InferenceStage(bus, {
      generateResponse: jest.fn().mockRejectedValue(new Error('down')),
    }).process(infCtx(new StubMessage('x')));
    expect(SwarmCoordinator.getInstance().getClaim('x')).toBeUndefined();
  });
});
