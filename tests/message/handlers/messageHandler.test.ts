import { handleMessage } from '@message/handlers/messageHandler';
import { IMessage } from '@message/interfaces/IMessage';
import { getLlmProvider } from '@llm/getLlmProvider';
import { stripBotId } from '@message/helpers/processing/stripBotId';
import { addUserHintFn } from '@message/helpers/processing/addUserHint';
import { shouldReplyToMessage } from '@message/helpers/processing/shouldReplyToMessage';
import messageConfig from '@config/messageConfig';

// Mock dependencies
jest.mock('@llm/getLlmProvider');
jest.mock('@message/management/getMessengerProvider');
jest.mock('@message/helpers/processing/stripBotId');
jest.mock('@message/helpers/processing/addUserHint');
jest.mock('@message/helpers/processing/shouldReplyToMessage');
jest.mock('@config/messageConfig');

const mockGetLlmProvider = getLlmProvider as jest.MockedFunction<typeof getLlmProvider>;
const mockGetMessengerProvider = require('@message/management/getMessengerProvider').getMessengerProvider as jest.MockedFunction<any>;
const mockStripBotId = stripBotId as jest.MockedFunction<typeof stripBotId>;
const mockAddUserHint = addUserHintFn as jest.MockedFunction<typeof addUserHintFn>;
const mockShouldReply = shouldReplyToMessage as jest.MockedFunction<typeof shouldReplyToMessage>;
const mockMessageConfig = messageConfig as jest.Mocked<typeof messageConfig>;

class MockMessage implements IMessage {
  public data: any = {};
  public role: string = 'user';
  public content: string;
  public platform: string = 'test';
  public tool_calls?: any[];
  public metadata?: any;

  constructor(
    public text: string,
    public channelId: string = 'test-channel',
    public authorId: string = 'test-user',
    public messageId: string = 'test-message-id',
    public isBot: boolean = false
  ) {
    this.content = text;
  }

  getText(): string { return this.text; }
  getChannelId(): string { return this.channelId; }
  getAuthorId(): string { return this.authorId; }
  getMessageId(): string { return this.messageId; }
  isFromBot(): boolean { return this.isBot; }
  getTimestamp(): Date { return new Date(); }
  setText(text: string): void { this.text = text; }
  getChannelTopic(): string | null { return 'Test Topic'; }
  getUserMentions(): string[] { return []; }
  getChannelUsers(): string[] { return ['user1', 'user2']; }
  mentionsUsers(userId: string): boolean { return false; }
  getAuthorName(): string { return 'Test User'; }
  getGuildOrWorkspaceId(): string | null { return 'test-guild'; }
  isReplyToBot(): boolean { return false; }
}

describe('messageHandler', () => {
  let mockLlmProvider: any;
  let mockBotConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLlmProvider = {
      generateChatCompletion: jest.fn().mockResolvedValue('AI response')
    };
    
    const mockMessengerProvider = {
      sendMessageToChannel: jest.fn().mockResolvedValue('msg-123'),
      getClientId: jest.fn().mockReturnValue('bot-123')
    };
    
    mockBotConfig = {
      BOT_ID: 'bot-123',
      MESSAGE_PROVIDER: 'discord'
    };
    
    mockGetLlmProvider.mockReturnValue([mockLlmProvider]);
    mockGetMessengerProvider.mockReturnValue([mockMessengerProvider]);
    mockStripBotId.mockImplementation((text) => text);
    mockAddUserHint.mockImplementation((text) => text);
    mockShouldReply.mockReturnValue(true);
    mockMessageConfig.get.mockImplementation((key: any) => {
      const config: { [key: string]: any } = {
        MESSAGE_IGNORE_BOTS: true,
        MESSAGE_ADD_USER_HINT: false,
        MESSAGE_STRIP_BOT_ID: true,
        MESSAGE_PREFIX_ALL_MESSAGES: '',
        MESSAGE_PREFIX_ALL_REPLIES: '',
        MESSAGE_MIN_INTERVAL_MS: 1000,
        MESSAGE_MAX_TOKENS_COMPLETION: 2048,
        MESSAGE_MAX_TOKENS_CHAT: 4096,
        botId: 'bot-123',
      };
      if (typeof key === 'string') {
        return config[key];
      }
      return undefined;
    });
  });

  describe('basic message handling', () => {
    it('should handle basic message processing', async () => {
      // Test simple message
      const message = new MockMessage('Hello AI');
      const historyMessages: IMessage[] = [];

      const response = await handleMessage(message, historyMessages, mockBotConfig);

      expect(response).toBe('AI response');
      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalledWith(
        'Hello AI',
        historyMessages,
        expect.objectContaining({
          channelId: 'test-channel',
          botId: 'bot-123',
        })
      );

      // Test with history
      const message2 = new MockMessage('Follow up question');
      const historyMessages2 = [
        new MockMessage('Previous message 1'),
        new MockMessage('Previous message 2')
      ];

      await handleMessage(message2, historyMessages2, mockBotConfig);

      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalledWith(
        'Follow up question',
        historyMessages2,
        expect.any(Object)
      );

      // Test bot ID stripping
      mockStripBotId.mockImplementation((text) => text.includes('<@bot-123>') ? 'Stripped message' : text);
      const message3 = new MockMessage('<@bot-123> Hello');

      await handleMessage(message3, [], mockBotConfig);

      expect(mockStripBotId).toHaveBeenCalledWith('<@bot-123> Hello', 'bot-123');
      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalledWith(
        'Stripped message',
        [],
        expect.any(Object)
      );

      // Test user hints
      mockAddUserHint.mockReturnValue('(from test-user) Hello');
      const message4 = new MockMessage('Hello');

      await handleMessage(message4, [], mockBotConfig);

      expect(mockAddUserHint).toHaveBeenLastCalledWith('Hello', 'test-user', 'bot-123');
    });
  });

  describe('reply decision logic', () => {
    it('should handle reply decision logic', async () => {
      // Test not processing when shouldReply returns false
      mockShouldReply.mockReturnValue(false);
      const message = new MockMessage('Hello');

      const response = await handleMessage(message, [], mockBotConfig);

      expect(response).toBeNull();
      expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();

      // Test checking reply conditions
      mockShouldReply.mockReturnValue(true);
      const message2 = new MockMessage('Hello');

      await handleMessage(message2, [], mockBotConfig);

      expect(mockShouldReply).toHaveBeenCalledWith(message2, 'bot-123', 'discord');
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Test LLM provider errors
      mockLlmProvider.generateChatCompletion.mockRejectedValue(new Error('LLM Error'));
      const message = new MockMessage('Hello');

      const response = await handleMessage(message, [], mockBotConfig);

      expect(response).toMatch(/error/i);

      // Test missing LLM provider
      mockGetLlmProvider.mockReturnValue([]);
      const message2 = new MockMessage('Hello');

      const response2 = await handleMessage(message2, [], mockBotConfig);

      expect(response2).toMatch(/no.*provider/i);

      // Test processing errors in helper functions
      mockStripBotId.mockImplementation(() => {
        throw new Error('Strip error');
      });
      const message3 = new MockMessage('Hello');

      const response3 = await handleMessage(message3, [], mockBotConfig);

      expect(typeof response3).toBe('string');
    });
  });

  describe('configuration handling', () => {
    it('should handle configuration correctly', async () => {
      // Test respecting message configuration
      mockMessageConfig.get.mockImplementation((key: any) => {
        if (key === 'MESSAGE_STRIP_BOT_ID') return true;
        if (key === 'MESSAGE_ADD_USER_HINT') return true;
        return false;
      });

      const message = new MockMessage('Hello');
      await handleMessage(message, [], mockBotConfig);

      expect(mockMessageConfig.get).toHaveBeenCalled();

      // Test different integration types
      const slackConfig = { ...mockBotConfig, integration: 'slack' };
      const message2 = new MockMessage('Hello');

      await handleMessage(message2, [], slackConfig);

      expect(mockShouldReply).toHaveBeenCalledWith(message2, 'bot-123', 'slack');
    });
  });

  describe('message content processing', () => {
    it('should handle different message content', async () => {
      // Test empty messages
      const message = new MockMessage('');

      const response = await handleMessage(message, [], mockBotConfig);

      expect(response).toBeNull();

      // Test very long messages
      const longMessage = 'x'.repeat(10000);
      const message2 = new MockMessage(longMessage);

      await handleMessage(message2, [], mockBotConfig);

      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();

      // Test special characters
      const specialMessage = '🚀 Hello! @user #channel $special &chars';
      const message3 = new MockMessage(specialMessage);

      await handleMessage(message3, [], mockBotConfig);

      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalledWith(
        specialMessage,
        [],
        expect.any(Object)
      );
    });
  });
});
