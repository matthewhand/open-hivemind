import { SlackService } from '@integrations/slack/SlackService';


describe('SlackService - joinConfiguredChannels', () => {
  let slackService: SlackService;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.SLACK_BOT_TOKEN = 'test-token';
    slackService = SlackService.getInstance();
    jest.spyOn(console, 'log').mockImplementation(() => {}); // Silence console logs
    jest.spyOn(console, 'warn').mockImplementation(() => {}); // Silence warnings
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Restore console.log after each test
  });

  test('should join multiple channels listed in SLACK_JOIN_CHANNELS', async () => {
    process.env.SLACK_JOIN_CHANNELS = 'general,random,support';

    // Mock `joinChannel` to return fake IDs
    jest.spyOn(slackService, 'joinChannel').mockImplementation(async (channel) => {});

    await slackService.joinConfiguredChannels();

    expect(slackService.joinChannel).toHaveBeenCalledTimes(3);
    expect(slackService.joinChannel).toHaveBeenCalledWith('general');
    expect(slackService.joinChannel).toHaveBeenCalledWith('random');
    expect(slackService.joinChannel).toHaveBeenCalledWith('support');
  });

  test('should do nothing if SLACK_JOIN_CHANNELS is not set', async () => {
    delete process.env.SLACK_JOIN_CHANNELS;

    jest.spyOn(slackService, 'joinChannel').mockImplementation(jest.fn());

    await slackService.joinConfiguredChannels();

    expect(slackService.joinChannel).not.toHaveBeenCalled();
  });

  test('should do nothing if SLACK_JOIN_CHANNELS is empty', async () => {
    process.env.SLACK_JOIN_CHANNELS = '';

    slackService.joinChannel = jest.fn();

    await slackService.joinConfiguredChannels();

    expect(slackService.joinChannel).not.toHaveBeenCalled();
  });

  test('should trim spaces from channel names', async () => {
    process.env.SLACK_JOIN_CHANNELS = ' general , random ';

    slackService.joinChannel = jest.fn(async (channel) => {});

    await slackService.joinConfiguredChannels();

    expect(slackService.joinChannel).toHaveBeenCalledWith('general');
    expect(slackService.joinChannel).toHaveBeenCalledWith('random');
  });

  test('should log a warning if joining a channel fails', async () => {
    process.env.SLACK_JOIN_CHANNELS = 'general,random';

    slackService.joinChannel = jest.fn(async (channel) => {
      if (channel === 'random') {
        throw new Error('Simulated failure');
      }
    });

    const warnSpy = jest.spyOn(console, 'warn');

    await slackService.joinConfiguredChannels();

    expect(warnSpy).toHaveBeenCalledWith('[Slack] Could not join #random');
  });
});
