/**
 * transfer_to_bot handoff via MessageBus.
 */

import { IMessage } from '@hivemind/shared-types';
import { BotConfigurationManager } from '../../../src/config/BotConfigurationManager';
import { MessageBus } from '../../../src/events/MessageBus';
import { SwarmCoordinator } from '../../../src/services/SwarmCoordinator';
import { ToolManager } from '../../../src/services/ToolManager';

class StubMessage extends IMessage {
  constructor(
    private id = 'msg-transfer-1',
    private text = 'please hand off'
  ) {
    super({}, 'user');
    this.content = text;
    this.channelId = 'ch-1';
    this.platform = 'discord';
  }
  getMessageId(): string {
    return this.id;
  }
  getText(): string {
    return this.text;
  }
  getTimestamp(): Date {
    return new Date();
  }
  getChannelId(): string {
    return this.channelId;
  }
  getAuthorId(): string {
    return 'user-1';
  }
  getAuthorName(): string {
    return 'User';
  }
  isFromBot(): boolean {
    return false;
  }
  isReplyToBot(): boolean {
    return false;
  }
  mentionsUsers(): boolean {
    return false;
  }
  getUserMentions(): string[] {
    return [];
  }
  getChannelUsers(): string[] {
    return [];
  }
  getChannelTopic(): string | null {
    return null;
  }
}

describe('ToolManager transfer_to_bot', () => {
  let emitSpy: jest.SpyInstance;
  let releaseSpy: jest.SpyInstance;

  beforeEach(() => {
    MessageBus.getInstance().reset();
    SwarmCoordinator.resetInstance();
    emitSpy = jest.spyOn(MessageBus.getInstance(), 'emit');
    releaseSpy = jest.spyOn(SwarmCoordinator.getInstance(), 'releaseClaim');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    MessageBus.getInstance().reset();
    SwarmCoordinator.resetInstance();
  });

  it('fails when targetBotName is missing', async () => {
    const tm = ToolManager.getInstance();
    const result = await tm.executeTool('bot-a', 'transfer_to_bot', { reason: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/targetBotName/i);
  });

  it('fails when transferring to self', async () => {
    const tm = ToolManager.getInstance();
    const result = await tm.executeTool('bot-a', 'transfer_to_bot', {
      targetBotName: 'bot-a',
      reason: 'noop',
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/self/i);
  });

  it('fails without sourceMessage context', async () => {
    jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
      getBot: () => ({ name: 'bot-b' }),
      getAllBots: () => [{ name: 'bot-b' }],
    } as unknown as BotConfigurationManager);

    const tm = ToolManager.getInstance();
    const result = await tm.executeTool(
      'bot-a',
      'transfer_to_bot',
      { targetBotName: 'bot-b', reason: 'specialist' },
      {}
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/sourceMessage/i);
  });

  it('fails when target bot is unknown', async () => {
    jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
      getBot: () => undefined,
      getAllBots: () => [{ name: 'other' }],
    } as unknown as BotConfigurationManager);

    const tm = ToolManager.getInstance();
    const msg = new StubMessage();
    const result = await tm.executeTool(
      'bot-a',
      'transfer_to_bot',
      { targetBotName: 'missing-bot', reason: 'x' },
      { sourceMessage: msg }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('emits message:incoming to the target bot and releases swarm claim', async () => {
    jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
      getBot: (name: string) =>
        name === 'specialist' ? { name: 'specialist', MESSAGE_PROVIDER: 'discord' } : undefined,
      getAllBots: () => [{ name: 'specialist' }],
    } as unknown as BotConfigurationManager);

    const tm = ToolManager.getInstance();
    const msg = new StubMessage();
    SwarmCoordinator.getInstance().claimMessage(msg.getMessageId(), 'bot-a', 'ch-1');

    const result = await tm.executeTool(
      'bot-a',
      'transfer_to_bot',
      { targetBotName: 'specialist', reason: 'domain expertise' },
      {
        sourceMessage: msg,
        history: [],
        channelId: 'ch-1',
        messageProvider: 'discord',
      }
    );

    expect(result.success).toBe(true);
    expect(result.result).toMatchObject({
      transferred: true,
      targetBotName: 'specialist',
      hop: 1,
    });
    expect(releaseSpy).toHaveBeenCalledWith(msg.getMessageId());
    expect(emitSpy).toHaveBeenCalledWith(
      'message:incoming',
      expect.objectContaining({
        botName: 'specialist',
        channelId: 'ch-1',
        message: msg,
        metadata: expect.objectContaining({
          handoff: expect.objectContaining({
            from: 'bot-a',
            to: 'specialist',
            hop: 1,
          }),
        }),
      })
    );
  });

  it('refuses transfers beyond hop limit', async () => {
    jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
      getBot: () => ({ name: 'bot-c' }),
      getAllBots: () => [{ name: 'bot-c' }],
    } as unknown as BotConfigurationManager);

    const tm = ToolManager.getInstance();
    const msg = new StubMessage();
    const result = await tm.executeTool(
      'bot-a',
      'transfer_to_bot',
      { targetBotName: 'bot-c', reason: 'loop' },
      { sourceMessage: msg, transferHop: 3 }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/hop limit/i);
  });
});
