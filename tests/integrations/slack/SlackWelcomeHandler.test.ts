import { KnownBlock } from '@slack/web-api';
import messageConfig from '@src/config/messageConfig';
import slackConfig from '@src/config/slackConfig';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { SlackBotManager } from '../../../packages/adapter-slack/src/SlackBotManager';
import { SlackWelcomeHandler } from '../../../packages/adapter-slack/src/SlackWelcomeHandler';

// Mock dependencies
jest.mock('@src/config/slackConfig');
jest.mock('@src/config/messageConfig');
jest.mock('@src/llm/getLlmProvider');
jest.mock('../../../packages/adapter-slack/src/SlackBotManager');

describe('SlackWelcomeHandler', () => {
  let handler: SlackWelcomeHandler;
  let mockBotManager: jest.Mocked<SlackBotManager>;
  let mockWebClient: any;
  let mockLlmProvider: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock web client
    mockWebClient = {
      conversations: {
        info: jest.fn(),
        join: jest.fn(),
      },
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ts: '1234567890.123456' }),
      },
    };

    // Setup mock bot manager
    mockBotManager = {
      getAllBots: jest.fn(),
      getBotByName: jest.fn(),
    } as any;

    // Setup mock LLM provider
    mockLlmProvider = {
      generateChatCompletion: jest.fn(),
    };

    // Setup default mocks
    (getLlmProvider as jest.Mock).mockReturnValue([mockLlmProvider]);
    mockBotManager.getAllBots.mockReturnValue([
      {
        webClient: mockWebClient,
        botUserId: 'U1234567890',
        botUserName: 'test-bot',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-secret',
        config: {},
      },
    ]);

    // Setup config mocks
    (slackConfig.get as jest.Mock).mockImplementation((key: string) => {
      switch (key) {
        case 'SLACK_USER_JOIN_CHANNEL_MESSAGE':
          return '# Welcome, {user}, to the {channel} channel! :wave:\n\n## Actions\n- [Test Button](action:test_{channel})';
        case 'SLACK_BOT_LEARN_MORE_MESSAGE':
          return 'Learn more about {channel}';
        case 'SLACK_BUTTON_MAPPINGS':
          return '{"custom_action": "Custom response"}';
        case 'SLACK_JOIN_CHANNELS':
          return 'general,random';
        default:
          return undefined;
      }
    });

    (messageConfig.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'MESSAGE_USERNAME_OVERRIDE') {
        return 'Test Bot';
      }
      return undefined;
    });

    handler = new SlackWelcomeHandler(mockBotManager);
  });

  describe('constructor', () => {
    it('should initialize successfully with valid bot manager', () => {
      expect(handler).toBeInstanceOf(SlackWelcomeHandler);
    });

    it('should throw error when bot manager is not provided', () => {
      expect(() => new SlackWelcomeHandler(null as any)).toThrow(
        'SlackBotManager instance required'
      );
    });

    it('should throw error when bot manager is undefined', () => {
      expect(() => new SlackWelcomeHandler(undefined as any)).toThrow(
        'SlackBotManager instance required'
      );
    });
  });

  describe('sendBotWelcomeMessage', () => {
    it('should send bot welcome message successfully', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        channel: { name: 'test-channel' },
      });
      mockLlmProvider.generateChatCompletion.mockResolvedValue('Test quote about channels');

      await (handler as any).sendBotWelcomeMessage('C1234567890');

      expect(mockWebClient.conversations.info).toHaveBeenCalledWith({ channel: 'C1234567890' });
      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should use channel ID as fallback when channel info fails', async () => {
      mockWebClient.conversations.info.mockRejectedValue(new Error('Channel not found'));
      mockLlmProvider.generateChatCompletion.mockResolvedValue('Test quote');

      await (handler as any).sendBotWelcomeMessage('C1234567890');

      expect(mockWebClient.conversations.info).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should use fallback quote when LLM provider fails', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        channel: { name: 'test-channel' },
      });
      mockLlmProvider.generateChatCompletion.mockRejectedValue(new Error('LLM error'));

      await (handler as any).sendBotWelcomeMessage('C1234567890');

      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should use fallback quote when no LLM provider is available', async () => {
      (getLlmProvider as jest.Mock).mockReturnValue([]);

      await (handler as any).sendBotWelcomeMessage('C1234567890');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should throw error when channel is not provided', async () => {
      await expect((handler as any).sendBotWelcomeMessage('')).rejects.toThrow(
        'Channel ID required'
      );
    });

    it('should handle empty LLM response with default quote', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        channel: { name: 'test-channel' },
      });
      mockLlmProvider.generateChatCompletion.mockResolvedValue('');

      await (handler as any).sendBotWelcomeMessage('C1234567890');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });
  });

  describe('sendUserWelcomeMessage', () => {
    it('should send user welcome message successfully', async () => {
      mockWebClient.conversations.info.mockResolvedValue({
        channel: { name: 'test-channel' },
      });

      await (handler as any).sendUserWelcomeMessage('C1234567890', 'john.doe');

      expect(mockWebClient.conversations.info).toHaveBeenCalledWith({ channel: 'C1234567890' });
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should use channel ID as fallback when channel info fails', async () => {
      mockWebClient.conversations.info.mockRejectedValue(new Error('Channel not found'));

      await (handler as any).sendUserWelcomeMessage('C1234567890', 'john.doe');

      expect(mockWebClient.conversations.info).toHaveBeenCalled();
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should throw error when channel is not provided', async () => {
      await expect((handler as any).sendUserWelcomeMessage('', 'john.doe')).rejects.toThrow(
        'Channel and userName required'
      );
    });

    it('should throw error when userName is not provided', async () => {
      await expect((handler as any).sendUserWelcomeMessage('C1234567890', '')).rejects.toThrow(
        'Channel and userName required'
      );
    });

    it('should use custom message from config', async () => {
      (slackConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SLACK_USER_JOIN_CHANNEL_MESSAGE') {
          return 'Custom welcome {user} to {channel}';
        }
        return undefined;
      });

      await (handler as any).sendUserWelcomeMessage('C1234567890', 'john.doe');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });
  });

  describe('processWelcomeMessage', () => {
    it('should process markdown with buttons successfully', async () => {
      const markdown =
        '# Welcome\n\nThis is a test message.\n\n## Actions\n- [Button 1](action:action1)\n- [Button 2](action:action2)';

      const blocks = await (handler as any).processWelcomeMessage(markdown, 'C1234567890');

      expect(blocks).toHaveLength(2); // Content block + actions block
      expect(blocks[1]).toMatchObject({
        type: 'actions',
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: 'button',
            text: { type: 'plain_text', text: 'Button 1' },
            action_id: 'action1',
          }),
          expect.objectContaining({
            type: 'button',
            text: { type: 'plain_text', text: 'Button 2' },
            action_id: 'action2',
          }),
        ]),
      });
    });

    it('should process markdown without buttons', async () => {
      const markdown = '# Welcome\n\nThis is a test message without buttons.';

      const blocks = await (handler as any).processWelcomeMessage(markdown, 'C1234567890');

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).not.toBe('actions');
    });

    it('should handle empty markdown', async () => {
      const blocks = await (handler as any).processWelcomeMessage(' ', 'C1234567890');

      expect(blocks).toHaveLength(0);
    });

    it('should throw error when markdown is not provided', async () => {
      await expect((handler as any).processWelcomeMessage('', 'C1234567890')).rejects.toThrow(
        'Markdown and channel required'
      );
    });

    it('should throw error when channel is not provided', async () => {
      await expect((handler as any).processWelcomeMessage('# Test', '')).rejects.toThrow(
        'Markdown and channel required'
      );
    });

    it('should handle malformed button syntax gracefully', async () => {
      const markdown =
        '# Welcome\n\n## Actions\n- Invalid button format\n- [Valid Button](action:valid)';

      const blocks = await (handler as any).processWelcomeMessage(markdown, 'C1234567890');

      expect(blocks).toHaveLength(2);
      expect(blocks[1]).toMatchObject({
        type: 'actions',
        elements: [
          expect.objectContaining({
            type: 'button',
            text: { type: 'plain_text', text: 'Valid Button' },
          }),
        ],
      });
    });
  });

  describe('handleButtonClick', () => {
    it('should handle valid predefined actions', async () => {
      const actions = [
        { actionId: 'learn_objectives_C1234567890', expectedText: 'learning objectives' },
        { actionId: 'how_to_C1234567890', expectedText: 'how I work' },
        { actionId: 'contact_support_C1234567890', expectedText: 'Need support' },
        { actionId: 'report_issue_C1234567890', expectedText: 'report it directly' },
        { actionId: 'learn_more_test', expectedText: 'Learn more about' },
      ];

      for (const { actionId, expectedText } of actions) {
        mockWebClient.chat.postMessage.mockClear();
        await (handler as any).handleButtonClick('C1234567890', 'U1234567890', actionId);

        expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            channel: 'C1234567890',
            text: expect.stringContaining(expectedText),
          })
        );
      }
    });

    it('should handle custom and unknown actions', async () => {
      // Test custom action
      delete process.env.SLACK_BUTTON_MAPPINGS;
      await (handler as any).handleButtonClick('C1234567890', 'U1234567890', 'custom_action');
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C1234567890',
          text: 'Custom response',
        })
      );

      // Test unknown action
      mockWebClient.chat.postMessage.mockClear();
      await (handler as any).handleButtonClick('C1234567890', 'U1234567890', 'unknown_action');
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C1234567890',
          text: expect.stringContaining("Sorry, I don't recognize that action"),
        })
      );
    });

    it('should handle errors and edge cases', async () => {
      // Test missing parameters
      await expect((handler as any).handleButtonClick('', 'U1234567890', 'action')).rejects.toThrow(
        'Channel, userId, and actionId required'
      );
      await expect((handler as any).handleButtonClick('C1234567890', '', 'action')).rejects.toThrow(
        'Channel, userId, and actionId required'
      );
      await expect(
        (handler as any).handleButtonClick('C1234567890', 'U1234567890', '')
      ).rejects.toThrow('Channel, userId, and actionId required');

      // Test invalid JSON in button mappings
      (slackConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SLACK_BUTTON_MAPPINGS') {
          return 'invalid json';
        }
        return undefined;
      });

      await (handler as any).handleButtonClick('C1234567890', 'U1234567890', 'test_action');
      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });
  });

  describe('joinConfiguredChannelsForBot', () => {
    it('should join configured channels successfully', async () => {
      mockWebClient.conversations.join.mockResolvedValue({ ok: true });

      await (handler as any).joinConfiguredChannelsForBot({
        webClient: mockWebClient,
        botUserId: 'U1234567890',
        botUserName: 'test-bot',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-secret',
        config: {},
      });

      expect(mockWebClient.conversations.join).toHaveBeenCalledTimes(2);
      expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel: 'general' });
      expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel: 'random' });
    });

    it('should handle channel join failures gracefully', async () => {
      mockWebClient.conversations.join
        .mockRejectedValueOnce(new Error('Already in channel'))
        .mockResolvedValueOnce({ ok: true });

      await (handler as any).joinConfiguredChannelsForBot({
        webClient: mockWebClient,
        botUserId: 'U1234567890',
        botUserName: 'test-bot',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-secret',
        config: {},
      });

      expect(mockWebClient.conversations.join).toHaveBeenCalledTimes(2);
    });

    it('should skip when no channels are configured', async () => {
      (slackConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SLACK_JOIN_CHANNELS') {
          return undefined;
        }
        return undefined;
      });

      await (handler as any).joinConfiguredChannelsForBot({
        webClient: mockWebClient,
        botUserId: 'U1234567890',
        botUserName: 'test-bot',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-secret',
        config: {},
      });

      expect(mockWebClient.conversations.join).not.toHaveBeenCalled();
    });

    it('should handle empty channel list', async () => {
      (slackConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SLACK_JOIN_CHANNELS') {
          return '';
        }
        return undefined;
      });

      await (handler as any).joinConfiguredChannelsForBot({
        webClient: mockWebClient,
        botUserId: 'U1234567890',
        botUserName: 'test-bot',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-secret',
        config: {},
      });

      expect(mockWebClient.conversations.join).not.toHaveBeenCalled();
    });

    it('should handle whitespace in channel names', async () => {
      (slackConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'SLACK_JOIN_CHANNELS') {
          return '  general  ,  random  ';
        }
        return undefined;
      });

      mockWebClient.conversations.join.mockResolvedValue({ ok: true });

      await (handler as any).joinConfiguredChannelsForBot({
        webClient: mockWebClient,
        botUserId: 'U1234567890',
        botUserName: 'test-bot',
        botToken: 'xoxb-test-token',
        signingSecret: 'test-secret',
        config: {},
      });

      expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel: 'general' });
      expect(mockWebClient.conversations.join).toHaveBeenCalledWith({ channel: 'random' });
    });
  });

  describe('sendMessageToChannel (private method)', () => {
    it('should send message successfully', async () => {
      const result = await (handler as any).sendMessageToChannel('C1234567890', 'Test message');

      expect(result).toBe('1234567890.123456');
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C1234567890',
          text: 'Test message',
          username: 'Test Bot',
        })
      );
    });

    it('should handle message with blocks', async () => {
      const blocks: KnownBlock[] = [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'Test block' },
        },
      ];

      await (handler as any).sendMessageToChannel(
        'C1234567890',
        'Test message',
        undefined,
        undefined,
        blocks
      );

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          blocks: expect.any(Array),
        })
      );
    });

    it('should handle message with thread ID', async () => {
      await (handler as any).sendMessageToChannel(
        'C1234567890',
        'Test message',
        undefined,
        '1234567890.123456'
      );

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          thread_ts: '1234567890.123456',
        })
      );
    });

    it('should handle message with custom sender name', async () => {
      await (handler as any).sendMessageToChannel('C1234567890', 'Test message', 'Custom Bot');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'Custom Bot',
        })
      );
    });

    it('should handle empty text with blocks', async () => {
      const blocks: KnownBlock[] = [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'Test block' },
        },
      ];

      await (handler as any).sendMessageToChannel('C1234567890', '', undefined, undefined, blocks);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Message with interactive content',
        })
      );
    });

    it('should handle empty text without blocks', async () => {
      await (handler as any).sendMessageToChannel('C1234567890', '', undefined, undefined, []);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'No content provided',
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockWebClient.chat.postMessage.mockRejectedValue(new Error('API error'));

      const result = await (handler as any).sendMessageToChannel('C1234567890', 'Test message');

      expect(result).toBe('');
    });

    it('should use fallback bot when bot by name is not found', async () => {
      mockBotManager.getBotByName.mockReturnValue(undefined);
      mockBotManager.getAllBots.mockReturnValue([
        {
          webClient: mockWebClient,
          botUserId: 'U1234567890',
          botUserName: 'fallback-bot',
          botToken: 'xoxb-test-token',
          signingSecret: 'test-secret',
          config: {},
        },
      ]);

      await (handler as any).sendMessageToChannel('C1234567890', 'Test message', 'Custom Bot');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });

    it('should handle missing bot manager gracefully', async () => {
      mockBotManager.getAllBots.mockReturnValue([]);

      const result = await (handler as any).sendMessageToChannel('C1234567890', 'Test message');

      expect(result).toBe('');
    });
  });
});
