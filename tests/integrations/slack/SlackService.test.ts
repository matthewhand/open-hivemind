import { SlackService } from '@integrations/slack/SlackService';
import { SlackBotManager } from '@integrations/slack/SlackBotManager';
import BotConfigurationManager from '@src/config/BotConfigurationManager';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@integrations/slack/SlackBotManager');
jest.mock('@src/config/BotConfigurationManager');
jest.mock('fs');
jest.mock('path');

const mockedSlackBotManager = SlackBotManager as jest.MockedClass<typeof SlackBotManager>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('SlackService', () => {
  let slackService: SlackService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance before each test
    (SlackService as any).instance = undefined;

    // Mock path.join
    mockedPath.join.mockImplementation((...args) => args.join('/'));

    // Mock BotConfigurationManager
    const mockConfigManager = {
      getAllBots: jest.fn(),
      getBot: jest.fn(),
    };
    
    jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue(mockConfigManager as any);

    // Default mock implementations for a successful scenario
    mockConfigManager.getAllBots.mockReturnValue([
      {
        name: 'test-bot',
        messageProvider: 'slack',
        slack: {
          botToken: 'xoxb-mock-token',
          signingSecret: 'mock-signing-secret',
          appToken: 'xapp-mock-token',
          defaultChannelId: 'mockDefaultChannelId',
          joinChannels: '',
          mode: 'socket'
        }
      }
    ]);

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

  it('should throw error if no Slack configuration is found', () => {
    // Mock empty configuration
    const mockConfigManager = {
      getAllBots: jest.fn().mockReturnValue([]),
      getBot: jest.fn(),
    };
    jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue(mockConfigManager as any);

    // Mock fs to simulate no legacy config files
    mockedFs.existsSync.mockReturnValue(false);

    expect(() => SlackService.getInstance()).toThrow();
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

    await expect(slackService.initialize()).rejects.toThrow('Failed to initialize SlackService for test-bot: Error: Bot manager init failed');
  });
});
