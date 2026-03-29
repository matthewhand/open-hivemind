import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleMessage } from '@src/message/handlers/messageHandler';
import { IMessage } from '@src/message/interfaces/IMessage';
import type { ContentFilterConfig } from '@src/types/config';

// Mock implementations
class MockMessage extends IMessage {
  constructor(
    private messageId: string,
    private channelId: string,
    private authorId: string,
    private text: string,
    private timestamp: Date = new Date(),
    public role: string = 'user',
    private isBot: boolean = false
  ) {
    super({}, role);
    this.content = text;
    this.channelId = channelId;
  }

  getMessageId(): string {
    return this.messageId;
  }

  getText(): string {
    return this.text;
  }

  setText(text: string): void {
    this.text = text;
    this.content = text;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  getChannelId(): string {
    return this.channelId;
  }

  getAuthorId(): string {
    return this.authorId;
  }

  getChannelTopic(): string | null {
    return null;
  }

  getUserMentions(): string[] {
    return [];
  }

  getChannelUsers(): string[] {
    return [];
  }

  mentionsUsers(_userId: string): boolean {
    return false;
  }

  isFromBot(): boolean {
    return this.isBot;
  }

  getAuthorName(): string {
    return 'TestUser';
  }
}

// Mock messenger provider
const mockMessengerProvider = {
  getClientId: () => 'test-bot-id',
  sendMessageToChannel: vi.fn().mockResolvedValue('msg-ts'),
  sendTypingIndicator: vi.fn().mockResolvedValue(undefined),
};

// Mock LLM provider
const mockLlmProvider = {
  generateChatCompletion: vi.fn().mockResolvedValue({
    text: 'This is a clean response',
    usage: { total_tokens: 50 },
  }),
  supportsHistory: () => true,
};

// Mock module imports
vi.mock('@message/management/getMessengerProvider', () => ({
  getMessengerProvider: vi.fn().mockResolvedValue([mockMessengerProvider]),
}));

vi.mock('@src/llm/getLlmProvider', () => ({
  getLlmProvider: vi.fn().mockResolvedValue([mockLlmProvider]),
}));

vi.mock('@src/middleware/quotaMiddleware', () => ({
  getQuotaManager: vi.fn().mockReturnValue({
    checkQuota: vi.fn().mockResolvedValue({ allowed: true, used: {} }),
    consumeQuota: vi.fn().mockResolvedValue(undefined),
    consumeTokens: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@src/services/MemoryManager', () => ({
  MemoryManager: {
    getInstance: vi.fn().mockReturnValue({
      retrieveRelevantMemories: vi.fn().mockResolvedValue([]),
      formatMemoriesForPrompt: vi.fn().mockReturnValue(''),
      storeConversationMemory: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Content Filter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DISABLE_QUOTA = 'true';
  });

  afterEach(() => {
    delete process.env.DISABLE_QUOTA;
  });

  describe('incoming message filtering', () => {
    it('should block messages containing blocked terms with low strictness', async () => {
      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'This is spam content');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam', 'badword'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBeNull();
      expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();
    });

    it('should allow messages without blocked terms', async () => {
      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'This is good content');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam', 'badword'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBe('This is a clean response');
      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();
    });

    it('should allow messages when content filter is disabled', async () => {
      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'This is spam content');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: false,
          strictness: 'low',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBe('This is a clean response');
      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();
    });

    it('should always allow system messages', async () => {
      const message = new MockMessage(
        'msg-1',
        'channel-1',
        'system',
        'This is spam content',
        new Date(),
        'system'
      );

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'high',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBe('This is a clean response');
      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();
    });

    it('should block messages with medium strictness substring matches', async () => {
      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'This is spammy content');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'medium',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBeNull();
      expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();
    });

    it('should block messages with high strictness obfuscation detection', async () => {
      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'This is sp4m content');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'high',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBeNull();
      expect(mockLlmProvider.generateChatCompletion).not.toHaveBeenCalled();
    });
  });

  describe('bot response filtering', () => {
    it('should block bot responses containing blocked terms', async () => {
      mockLlmProvider.generateChatCompletion.mockResolvedValueOnce({
        text: 'This response contains spam',
        usage: { total_tokens: 50 },
      });

      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'Tell me something');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBeNull();
      expect(mockLlmProvider.generateChatCompletion).toHaveBeenCalled();
      expect(mockMessengerProvider.sendMessageToChannel).not.toHaveBeenCalled();
    });

    it('should allow clean bot responses', async () => {
      mockLlmProvider.generateChatCompletion.mockResolvedValueOnce({
        text: 'This is a clean response',
        usage: { total_tokens: 50 },
      });

      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'Tell me something');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBe('This is a clean response');
      expect(mockMessengerProvider.sendMessageToChannel).toHaveBeenCalled();
    });
  });

  describe('notification behavior', () => {
    it('should send notification when MESSAGE_CONTENT_FILTER_NOTIFY is not false', async () => {
      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'This is spam content');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        MESSAGE_CONTENT_FILTER_NOTIFY: true,
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBeNull();
      expect(mockMessengerProvider.sendMessageToChannel).toHaveBeenCalledWith(
        'channel-1',
        'Your message contains content that is not allowed.',
        expect.any(String)
      );
    });

    it('should not send notification when MESSAGE_CONTENT_FILTER_NOTIFY is false', async () => {
      const message = new MockMessage('msg-1', 'channel-1', 'user-1', 'This is spam content');

      const botConfig = {
        name: 'TestBot',
        BOT_ID: 'bot-123',
        messageProvider: 'test',
        llmProvider: 'test',
        contentFilter: {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam'],
        } as ContentFilterConfig,
        MESSAGE_SYSTEM_PROMPT: 'You are a helpful assistant.',
        MESSAGE_CONTENT_FILTER_NOTIFY: false,
        LLM_MAX_TOKENS: 150,
        LLM_TEMPERATURE: 0.7,
      };

      const result = await handleMessage(message, [], botConfig);

      expect(result).toBeNull();
      expect(mockMessengerProvider.sendMessageToChannel).not.toHaveBeenCalled();
    });
  });
});
