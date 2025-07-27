import { IMessage } from '../../../src/message/interfaces/IMessage';

// Test implementation of IMessage for integration testing
class TestMessage extends IMessage {
  private _messageId: string;
  private _timestamp: Date;
  private _channelId: string;
  private _authorId: string;
  private _authorName: string;
  private _channelTopic: string | null;
  private _userMentions: string[];
  private _channelUsers: string[];
  private _isFromBot: boolean;

  constructor(
    data: any,
    role: string,
    content: string,
    messageId: string,
    timestamp: Date,
    channelId: string,
    authorId: string,
    authorName: string,
    channelTopic?: string | null,
    userMentions?: string[],
    channelUsers?: string[],
    isFromBot?: boolean
  ) {
    super(data, role);
    this.content = content;
    this._messageId = messageId;
    this._timestamp = timestamp;
    this._channelId = channelId;
    this._authorId = authorId;
    this._authorName = authorName;
    this._channelTopic = channelTopic || null;
    this._userMentions = userMentions || [];
    this._channelUsers = channelUsers || [];
    this._isFromBot = isFromBot || false;
  }

  getMessageId(): string {
    return this._messageId;
  }

  getTimestamp(): Date {
    return this._timestamp;
  }

  setText(text: string): void {
    this.content = text;
  }

  getChannelId(): string {
    return this._channelId;
  }

  getAuthorId(): string {
    return this._authorId;
  }

  getChannelTopic(): string | null {
    return this._channelTopic;
  }

  getUserMentions(): string[] {
    return this._userMentions;
  }

  getChannelUsers(): string[] {
    return this._channelUsers;
  }

  mentionsUsers(userId: string): boolean {
    return this._userMentions.includes(userId);
  }

  isFromBot(): boolean {
    return this._isFromBot;
  }

  getAuthorName(): string {
    return this._authorName;
  }
}

describe('IMessage Integration Tests', () => {
  describe('Constructor and Basic Properties', () => {
    it('should create a valid IMessage instance with TestMessage', () => {
      const testData = { platform: 'test', raw: 'test data' };
      const timestamp = new Date('2024-01-01T00:00:00Z');
      
      const message = new TestMessage(
        testData,
        'user',
        'Hello, world!',
        'msg-123',
        timestamp,
        'channel-456',
        'user-789',
        'TestUser',
        'Test Channel Topic',
        ['user-111', 'user-222'],
        ['user-111', 'user-222', 'user-333'],
        false
      );

      expect(message).toBeInstanceOf(IMessage);
      expect(message.content).toBe('Hello, world!');
      expect(message.role).toBe('user');
      expect(message.data).toEqual(testData);
      expect(message.metadata).toBeUndefined();
    });

    it('should prevent direct instantiation of IMessage', () => {
      expect(() => {
        new (IMessage as any)({}, 'user');
      }).toThrow(TypeError);
    });

    it('should handle tool role messages correctly', () => {
      const message = new TestMessage(
        {},
        'tool',
        'Tool response content',
        'msg-456',
        new Date(),
        'channel-123',
        'tool-789',
        'ToolBot',
        null,
        [],
        [],
        true
      );

      expect(message.role).toBe('tool');
      expect(message.getText()).toBe('Tool response content');
    });

    it('should handle assistant role messages with tool calls', () => {
      const toolCalls = [
        { id: 'call-1', type: 'function', function: { name: 'get_weather', arguments: '{"location": "Seattle"}' } }
      ];
      
      const message = new TestMessage(
        {},
        'assistant',
        'Let me check the weather for you.',
        'msg-789',
        new Date(),
        'channel-123',
        'assistant-bot',
        'Assistant',
        null,
        [],
        [],
        true
      );
      
      message.tool_calls = toolCalls;

      expect(message.role).toBe('assistant');
      expect(message.tool_calls).toEqual(toolCalls);
      expect(message.getText()).toBe('Let me check the weather for you.');
    });
  });

  describe('Message Content Management', () => {
    it('should allow updating message content', () => {
      const message = new TestMessage(
        {},
        'user',
        'Original content',
        'msg-123',
        new Date(),
        'channel-456',
        'user-789',
        'TestUser'
      );

      expect(message.getText()).toBe('Original content');
      
      message.setText('Updated content');
      expect(message.getText()).toBe('Updated content');
      expect(message.content).toBe('Updated content');
    });

    it('should handle empty content correctly', () => {
      const message = new TestMessage(
        {},
        'user',
        '',
        'msg-123',
        new Date(),
        'channel-456',
        'user-789',
        'TestUser'
      );

      expect(message.getText()).toBe('');
      
      message.setText('New content');
      expect(message.getText()).toBe('New content');
    });
  });

  describe('Message Identification', () => {
    it('should provide unique message identifiers', () => {
      const timestamp1 = new Date('2024-01-01T00:00:00Z');
      const timestamp2 = new Date('2024-01-01T00:00:01Z');
      
      const message1 = new TestMessage(
        {},
        'user',
        'Message 1',
        'msg-unique-1',
        timestamp1,
        'channel-456',
        'user-789',
        'TestUser'
      );

      const message2 = new TestMessage(
        {},
        'user',
        'Message 2',
        'msg-unique-2',
        timestamp2,
        'channel-456',
        'user-789',
        'TestUser'
      );

      expect(message1.getMessageId()).toBe('msg-unique-1');
      expect(message2.getMessageId()).toBe('msg-unique-2');
      expect(message1.getMessageId()).not.toBe(message2.getMessageId());
    });

    it('should provide consistent timestamps', () => {
      const timestamp = new Date('2024-01-01T12:00:00Z');
      
      const message = new TestMessage(
        {},
        'user',
        'Test message',
        'msg-123',
        timestamp,
        'channel-456',
        'user-789',
        'TestUser'
      );

      expect(message.getTimestamp()).toEqual(timestamp);
    });
  });

  describe('Channel and User Information', () => {
    it('should provide channel information', () => {
      const message = new TestMessage(
        {},
        'user',
        'Test message',
        'msg-123',
        new Date(),
        'channel-test-456',
        'user-789',
        'TestUser',
        'General Discussion Channel'
      );

      expect(message.getChannelId()).toBe('channel-test-456');
      expect(message.getChannelTopic()).toBe('General Discussion Channel');
    });

    it('should handle null channel topic', () => {
      const message = new TestMessage(
        {},
        'user',
        'Test message',
        'msg-123',
        new Date(),
        'channel-456',
        'user-789',
        'TestUser'
      );

      expect(message.getChannelTopic()).toBeNull();
    });

    it('should provide author information', () => {
      const message = new TestMessage(
        {},
        'user',
        'Test message',
        'msg-123',
        new Date(),
        'channel-456',
        'user-unique-789',
        'Alice Smith'
      );

      expect(message.getAuthorId()).toBe('user-unique-789');
      expect(message.getAuthorName()).toBe('Alice Smith');
    });

    it('should provide user mentions', () => {
      const mentions = ['user-111', 'user-222', 'user-333'];
      
      const message = new TestMessage(
        {},
        'user',
        'Hello @user1 and @user2',
        'msg-123',
        new Date(),
        'channel-456',
        'user-789',
        'TestUser',
        null,
        mentions
      );

      expect(message.getUserMentions()).toEqual(mentions);
      expect(message.mentionsUsers('user-111')).toBe(true);
      expect(message.mentionsUsers('user-999')).toBe(false);
    });

    it('should provide channel users', () => {
      const channelUsers = ['user-111', 'user-222', 'user-333', 'user-444'];
      
      const message = new TestMessage(
        {},
        'user',
        'Hello everyone',
        'msg-123',
        new Date(),
        'channel-456',
        'user-789',
        'TestUser',
        null,
        [],
        channelUsers
      );

      expect(message.getChannelUsers()).toEqual(channelUsers);
    });
  });

  describe('Bot Detection', () => {
    it('should identify bot messages', () => {
      const botMessage = new TestMessage(
        {},
        'assistant',
        'I am a bot message',
        'msg-123',
        new Date(),
        'channel-456',
        'bot-789',
        'BotUser',
        null,
        [],
        [],
        true
      );

      const userMessage = new TestMessage(
        {},
        'user',
        'I am a user message',
        'msg-456',
        new Date(),
        'channel-456',
        'user-123',
        'RealUser',
        null,
        [],
        [],
        false
      );

      expect(botMessage.isFromBot()).toBe(true);
      expect(userMessage.isFromBot()).toBe(false);
    });

    it('should handle default bot reply detection', () => {
      const message = new TestMessage(
        {},
        'user',
        'Test message',
        'msg-123',
        new Date(),
        'channel-456',
        'user-789',
        'TestUser'
      );

      expect(message.isReplyToBot()).toBe(false);
    });
  });

  describe('Integration with Message Processing', () => {
    it('should work with message history arrays', () => {
      const messages: IMessage[] = [];
      
      for (let i = 0; i < 5; i++) {
        messages.push(new TestMessage(
          { index: i },
          i % 2 === 0 ? 'user' : 'assistant',
          `Message ${i}`,
          `msg-${i}`,
          new Date(Date.now() + i * 1000),
          'channel-456',
          `user-${i}`,
          `User ${i}`
        ));
      }

      expect(messages).toHaveLength(5);
      expect(messages[0].getText()).toBe('Message 0');
      expect(messages[1].getText()).toBe('Message 1');
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should support filtering by role', () => {
      const messages: IMessage[] = [
        new TestMessage({}, 'user', 'User message', 'msg-1', new Date(), 'ch-1', 'user-1', 'User'),
        new TestMessage({}, 'assistant', 'Assistant message', 'msg-2', new Date(), 'ch-1', 'bot-1', 'Bot'),
        new TestMessage({}, 'system', 'System message', 'msg-3', new Date(), 'ch-1', 'sys-1', 'System'),
      ];

      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');

      expect(userMessages).toHaveLength(1);
      expect(assistantMessages).toHaveLength(1);
      expect(userMessages[0].getText()).toBe('User message');
      expect(assistantMessages[0].getText()).toBe('Assistant message');
    });
  });
});