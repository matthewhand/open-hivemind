import type { SlackActionContext } from './SlackInteractiveHandler';
import { SlackService } from './SlackService';

/**
 * Unit tests for the default interactive-action forward path: unmatched
 * actions are turned into synthetic messages and pushed through the normal
 * message-handler path (SlackBotManager.handleMessage) so bots/LLMs respond.
 *
 * The private method is exercised against a minimal stand-in instance to
 * avoid booting the full SlackService singleton.
 */
describe('SlackService.forwardActionToMessageHandler (default forward path)', () => {
  const ORIGINAL_DEFAULT_CHANNEL = process.env.SLACK_DEFAULT_CHANNEL_ID;

  afterEach(() => {
    if (ORIGINAL_DEFAULT_CHANNEL === undefined) {
      delete process.env.SLACK_DEFAULT_CHANNEL_ID;
    } else {
      process.env.SLACK_DEFAULT_CHANNEL_ID = ORIGINAL_DEFAULT_CHANNEL;
    }
  });

  const makeService = (opts: { defaultChannel?: string } = {}) => {
    const handleMessage = jest.fn().mockResolvedValue('');
    const botManager = {
      getAllBots: () => [{ config: { name: 'TestBot' } }],
      handleMessage,
    };
    const service: any = Object.create(SlackService.prototype);
    service.botManagers = new Map([['TestBot', botManager]]);
    service.botConfigs = new Map([
      ['TestBot', opts.defaultChannel ? { defaultChannel: opts.defaultChannel } : {}],
    ]);
    return { service, handleMessage };
  };

  const context = (overrides: Partial<SlackActionContext> = {}): SlackActionContext => ({
    actionId: 'custom_action',
    type: 'block_actions',
    channelId: 'C123',
    userId: 'U123',
    value: 'tell me a joke',
    payload: { user: { id: 'U123', username: 'alice' } },
    ...overrides,
  });

  it('forwards the action value as a message through the message-handler path', async () => {
    const { service, handleMessage } = makeService();

    await service.forwardActionToMessageHandler('TestBot', context());

    expect(handleMessage).toHaveBeenCalledTimes(1);
    const [message, history, botConfig] = handleMessage.mock.calls[0];
    expect(message.getText()).toBe('tell me a joke');
    expect(message.getChannelId()).toBe('C123');
    expect(message.getAuthorId()).toBe('U123');
    expect(history).toEqual([]);
    expect(botConfig).toEqual({ name: 'TestBot' });
  });

  it('falls back to the bot default channel when the payload has none', async () => {
    delete process.env.SLACK_DEFAULT_CHANNEL_ID;
    const { service, handleMessage } = makeService({ defaultChannel: 'CDEFAULT' });

    await service.forwardActionToMessageHandler('TestBot', context({ channelId: undefined }));

    expect(handleMessage).toHaveBeenCalledTimes(1);
    expect(handleMessage.mock.calls[0][0].getChannelId()).toBe('CDEFAULT');
  });

  it('uses label then action_id as text when the action has no value', async () => {
    const { service, handleMessage } = makeService();

    await service.forwardActionToMessageHandler(
      'TestBot',
      context({ value: undefined, text: undefined })
    );

    expect(handleMessage.mock.calls[0][0].getText()).toBe('custom_action');
  });

  it('does nothing when no channel can be resolved', async () => {
    delete process.env.SLACK_DEFAULT_CHANNEL_ID;
    const { service, handleMessage } = makeService();

    await service.forwardActionToMessageHandler('TestBot', context({ channelId: undefined }));

    expect(handleMessage).not.toHaveBeenCalled();
  });

  it('does nothing when the bot manager is unknown', async () => {
    const { service, handleMessage } = makeService();

    await service.forwardActionToMessageHandler('NoSuchBot', context());

    expect(handleMessage).not.toHaveBeenCalled();
  });
});
