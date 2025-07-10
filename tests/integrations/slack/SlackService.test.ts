import { SlackService } from '@integrations/slack/SlackService';
import slackConfig from '@config/slackConfig';
import { SlackBotManager } from '@integrations/slack/SlackBotManager';

jest.mock('@config/slackConfig');
jest.mock('@integrations/slack/SlackBotManager');

const mockedSlackConfig = slackConfig as jest.Mocked<typeof slackConfig>;
const mockedSlackBotManager = SlackBotManager as jest.MockedClass<typeof SlackBotManager>;

describe('SlackService', () => {
  let slackService: SlackService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance before each test
    (SlackService as any).instance = undefined;

    // Default mock implementations for a successful scenario
    mockedSlackConfig.get.mockImplementation((key: string | null | undefined) => {
      switch (key) {
        case 'SLACK_BOT_TOKEN': return 'xoxb-mock-token';
        case 'SLACK_APP_TOKEN': return 'xapp-mock-token';
        case 'SLACK_SIGNING_SECRET': return 'mock-signing-secret';
        case 'SLACK_MODE': return 'socket';
        case 'SLACK_JOIN_CHANNELS': return '';
        case 'SLACK_DEFAULT_CHANNEL_ID': return 'mockDefaultChannelId';
        default: return ''; // Default to empty string for other string keys
      }
    });
    mockedSlackBotManager.mockImplementation(() => ({
      initialize: jest.fn(),
      getAllBots: jest.fn(() => [{ botUserName: 'mockBot', botToken: 'mockToken' }]),
      setMessageHandler: jest.fn(),
      getBotByName: jest.fn(),
    } as any));
  });

  it('should be a singleton', () => {
    const instance1 = SlackService.getInstance();
    const instance2 = SlackService.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should throw error if SLACK_BOT_TOKEN is missing', () => {
    mockedSlackConfig.get.mockImplementation((key) => {
      if (key === 'SLACK_BOT_TOKEN') return '';
      if (key === 'SLACK_SIGNING_SECRET') return 'mock-signing-secret';
      return undefined;
    });
    expect(() => SlackService.getInstance()).toThrow('Slack configuration incomplete');
  });

  it('should throw error if SLACK_SIGNING_SECRET is missing', () => {
    mockedSlackConfig.get.mockImplementation((key) => {
      if (key === 'SLACK_BOT_TOKEN') return 'xoxb-mock-token';
      if (key === 'SLACK_SIGNING_SECRET') return '';
      return undefined;
    });
    expect(() => SlackService.getInstance()).toThrow('Slack configuration incomplete');
  });

  it('should initialize without an express app and throw error', async () => {
    slackService = SlackService.getInstance();
    await expect(slackService.initialize()).rejects.toThrow('Express app not configured');
  });

  it('should throw error if botManager.initialize fails', async () => {
    mockedSlackBotManager.mockImplementation(() => ({
      initialize: jest.fn(() => Promise.reject(new Error('Bot manager init failed'))),
      getAllBots: jest.fn(),
      setMessageHandler: jest.fn(),
      getBotByName: jest.fn(),
    } as any));

    slackService = SlackService.getInstance();
    const mockApp = { post: jest.fn() } as any;
    slackService.setApp(mockApp);

    await expect(slackService.initialize()).rejects.toThrow('Failed to initialize SlackService: Error: Bot manager init failed');
  });
});
