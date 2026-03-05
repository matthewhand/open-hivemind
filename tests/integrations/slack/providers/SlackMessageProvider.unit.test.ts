jest.mock('@integrations/slack/SlackService', () => {
  const sendMessageToChannel = jest.fn();
  const fetchMessages = jest.fn(async (..._args: any[]) => []);
  const getClientId = jest.fn(() => 'SVC_CLIENT_ID');

  const instance = {
    sendMessageToChannel,
    fetchMessages,
    getClientId,
  };

  return {
    SlackService: {
      getInstance: jest.fn(() => instance),
    },
  };
});

describe('SlackMessageProvider unit', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('a) getClientId delegates to SlackService.getInstance().getClientId()', async () => {
    const { SlackMessageProvider } =
      await import('../@src/integrations/slack/providers/SlackMessageProvider');
    const provider = new SlackMessageProvider();

    const clientId = provider.getClientId();
    expect(clientId).toBe('SVC_CLIENT_ID');

    const { SlackService } = require('@integrations/slack/SlackService');
    expect(SlackService.getInstance).toHaveBeenCalledTimes(1);
    const instance = SlackService.getInstance.mock.results[0].value;
    expect(instance.getClientId).toHaveBeenCalledTimes(1);
  });

  test('b) sendMessageToChannel delegates to slackService.sendMessageToChannel with args', async () => {
    const { SlackMessageProvider } =
      await import('../@src/integrations/slack/providers/SlackMessageProvider');
    const provider = new SlackMessageProvider();

    const channel = 'C123';
    const message = 'hello world';
    await provider.sendMessageToChannel(channel, message);

    const { SlackService } = require('@integrations/slack/SlackService');
    const instance = SlackService.getInstance.mock.results[0].value;

    expect(SlackService.getInstance).toHaveBeenCalledTimes(1);
    expect(instance.sendMessageToChannel).toHaveBeenCalledTimes(1);
    // Allow optional third arg (e.g., threadTs or options) to avoid brittleness
    const callArgs = instance.sendMessageToChannel.mock.calls[0];
    expect(callArgs[0]).toBe(channel);
    expect(callArgs[1]).toBe(message);
  });

  test('c) getMessages delegates to slackService.fetchMessages', async () => {
    const { SlackMessageProvider } =
      await import('../@src/integrations/slack/providers/SlackMessageProvider');
    const provider = new SlackMessageProvider();

    const channel = 'C456';
    await provider.getMessages(channel);

    const { SlackService } = require('@integrations/slack/SlackService');
    const instance = SlackService.getInstance.mock.results[0].value;

    expect(SlackService.getInstance).toHaveBeenCalledTimes(1);
    expect(instance.fetchMessages).toHaveBeenCalledTimes(1);
    expect(instance.fetchMessages).toHaveBeenCalledWith(channel);
  });
});
