import { IMessage } from '../../../src/message/interfaces/IMessage';
import { IMessengerService } from '../../../src/message/interfaces/IMessengerService';

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

// Test implementation of IMessengerService for integration testing
class TestMessengerService implements IMessengerService {
  private messages: Map<string, IMessage[]> = new Map();
  private clientId: string;
  private defaultChannel: string;
  private messageHandler:
    | ((message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>)
    | null = null;
  private initialized: boolean = false;

  constructor(clientId: string = 'test-client-123', defaultChannel: string = 'general') {
    this.clientId = clientId;
    this.defaultChannel = defaultChannel;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async sendMessageToChannel(
    channelId: string,
    message: string,
    senderName?: string,
    threadId?: string
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const testMessage = new TestMessage(
      { senderName, threadId },
      'assistant',
      message,
      messageId,
      new Date(),
      channelId,
      this.clientId,
      senderName || 'TestBot',
      null,
      [],
      []
    );

    if (!this.messages.has(channelId)) {
      this.messages.set(channelId, []);
    }

    this.messages.get(channelId)!.push(testMessage);
    return messageId;
  }

  async getMessagesFromChannel(channelId: string): Promise<IMessage[]> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    return this.messages.get(channelId) || [];
  }

  async sendPublicAnnouncement(channelId: string, announcement: any): Promise<void> {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }

    const announcementMessage = new TestMessage(
      announcement,
      'system',
      announcement.message || 'Announcement',
      `announcement-${Date.now()}`,
      new Date(),
      channelId,
      this.clientId,
      'System',
      null,
      [],
      []
    );

    if (!this.messages.has(channelId)) {
      this.messages.set(channelId, []);
    }

    this.messages.get(channelId)!.push(announcementMessage);
  }

  getClientId(): string {
    return this.clientId;
  }

  getDefaultChannel(): string {
    return this.defaultChannel;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.messages.clear();
  }

  setMessageHandler(
    handler: (message: IMessage, historyMessages: IMessage[], botConfig: any) => Promise<string>
  ): void {
    this.messageHandler = handler;
  }

  // Helper method for testing
  isInitialized(): boolean {
    return this.initialized;
  }

  getStoredMessages(channelId: string): IMessage[] {
    return this.messages.get(channelId) || [];
  }

  // Simulate receiving a message for testing
  async simulateMessage(message: IMessage): Promise<string | null> {
    if (!this.messageHandler) {
      return null;
    }

    const history = this.messages.get(message.getChannelId()) || [];
    return await this.messageHandler(message, history, {});
  }
}

describe('IMessengerService Integration Tests', () => {
  let service: TestMessengerService;

  beforeEach(() => {
    service = new TestMessengerService();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('Service Lifecycle', () => {
    it('should initialize and shutdown correctly', async () => {
      expect(service.isInitialized()).toBe(false);

      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      await service.shutdown();
      expect(service.isInitialized()).toBe(false);
    });

    it('should provide client and channel information', () => {
      const customService = new TestMessengerService('custom-client', 'custom-channel');

      expect(customService.getClientId()).toBe('custom-client');
      expect(customService.getDefaultChannel()).toBe('custom-channel');
    });
  });

  describe('Message Sending', () => {
    it('should send messages to channels', async () => {
      await service.initialize();

      const messageId = await service.sendMessageToChannel('general', 'Hello, world!', 'TestBot');

      expect(messageId).toMatch(/^msg-\d+-[a-z0-9]+$/);

      const messages = service.getStoredMessages('general');
      expect(messages).toHaveLength(1);
      expect(messages[0].getText()).toBe('Hello, world!');
      expect(messages[0].getAuthorName()).toBe('TestBot');
    });

    it('should send messages with thread IDs', async () => {
      await service.initialize();

      const messageId = await service.sendMessageToChannel(
        'general',
        'Thread reply',
        'TestBot',
        'thread-123'
      );

      expect(messageId).toBeDefined();

      const messages = service.getStoredMessages('general');
      expect(messages[0].data.threadId).toBe('thread-123');
    });

    it('should handle multiple channels', async () => {
      await service.initialize();

      await service.sendMessageToChannel('general', 'Message 1');
      await service.sendMessageToChannel('random', 'Message 2');
      await service.sendMessageToChannel('general', 'Message 3');

      const generalMessages = service.getStoredMessages('general');
      const randomMessages = service.getStoredMessages('random');

      expect(generalMessages).toHaveLength(2);
      expect(randomMessages).toHaveLength(1);
      expect(generalMessages[0].getText()).toBe('Message 1');
      expect(generalMessages[1].getText()).toBe('Message 3');
      expect(randomMessages[0].getText()).toBe('Message 2');
    });

    it('should throw error when sending messages before initialization', async () => {
      await expect(service.sendMessageToChannel('general', 'Test message')).rejects.toThrow(
        'Service not initialized'
      );
    });
  });

  describe('Message Retrieval', () => {
    it('should retrieve messages from channels', async () => {
      await service.initialize();

      await service.sendMessageToChannel('general', 'First message');
      await service.sendMessageToChannel('general', 'Second message');

      const messages = await service.getMessagesFromChannel('general');

      expect(messages).toHaveLength(2);
      expect(messages[0].getText()).toBe('First message');
      expect(messages[1].getText()).toBe('Second message');
    });

    it('should return empty array for channels with no messages', async () => {
      await service.initialize();

      const messages = await service.getMessagesFromChannel('empty-channel');

      expect(messages).toHaveLength(0);
      expect(messages).toEqual([]);
    });

    it('should throw error when retrieving messages before initialization', async () => {
      await expect(service.getMessagesFromChannel('general')).rejects.toThrow(
        'Service not initialized'
      );
    });
  });

  describe('Public Announcements', () => {
    it('should send public announcements', async () => {
      await service.initialize();

      const announcement = {
        title: 'System Update',
        message: 'The system will be updated at 3 PM',
        priority: 'high',
      };

      await service.sendPublicAnnouncement('general', announcement);

      const messages = service.getStoredMessages('general');
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('system');
      expect(messages[0].getText()).toBe('The system will be updated at 3 PM');
      expect(messages[0].data).toEqual(announcement);
    });

    it('should handle empty announcement messages', async () => {
      await service.initialize();

      await service.sendPublicAnnouncement('general', {});

      const messages = service.getStoredMessages('general');
      expect(messages).toHaveLength(1);
      expect(messages[0].getText()).toBe('Announcement');
    });
  });

  describe('Message Handler Integration', () => {
    it('should set and use message handlers', async () => {
      await service.initialize();

      const mockHandler = jest.fn().mockResolvedValue('Processed response');
      service.setMessageHandler(mockHandler);

      const testMessage = new TestMessage(
        {},
        'user',
        'Hello bot',
        'msg-123',
        new Date(),
        'general',
        'user-456',
        'TestUser'
      );

      const response = await service.simulateMessage(testMessage);

      expect(response).toBe('Processed response');
      expect(mockHandler).toHaveBeenCalledWith(testMessage, [], {});
    });

    it('should provide message history to handlers', async () => {
      await service.initialize();

      // Send some initial messages
      await service.sendMessageToChannel('general', 'Previous message 1');
      await service.sendMessageToChannel('general', 'Previous message 2');

      const mockHandler = jest.fn().mockResolvedValue('Response with history');
      service.setMessageHandler(mockHandler);

      const newMessage = new TestMessage(
        {},
        'user',
        'New message',
        'msg-new',
        new Date(),
        'general',
        'user-456',
        'TestUser'
      );

      await service.simulateMessage(newMessage);

      expect(mockHandler).toHaveBeenCalledWith(
        newMessage,
        expect.arrayContaining([
          expect.objectContaining({ content: 'Previous message 1' }),
          expect.objectContaining({ content: 'Previous message 2' }),
        ]),
        {}
      );
    });

    it('should return null when no handler is set', async () => {
      await service.initialize();

      const testMessage = new TestMessage(
        {},
        'user',
        'Hello bot',
        'msg-123',
        new Date(),
        'general',
        'user-456',
        'TestUser'
      );

      const response = await service.simulateMessage(testMessage);

      expect(response).toBeNull();
    });
  });

  describe('Complex Message Flow Integration', () => {
    it('should handle complete conversation flow', async () => {
      await service.initialize();

      // Set up a simple echo handler
      service.setMessageHandler(async (message, history, config) => {
        return `Echo: ${message.getText()}`;
      });

      // Send initial messages to establish history
      await service.sendMessageToChannel('general', 'Hello', 'Alice');
      await service.sendMessageToChannel('general', 'Echo: Hello', 'EchoBot');
      await service.sendMessageToChannel('general', 'How are you?', 'Alice');
      await service.sendMessageToChannel('general', 'Echo: How are you?', 'EchoBot');

      // Verify the complete conversation history
      const allMessages = await service.getMessagesFromChannel('general');
      expect(allMessages).toHaveLength(4);
      expect(allMessages[0].getText()).toBe('Hello');
      expect(allMessages[1].getText()).toBe('Echo: Hello');
      expect(allMessages[2].getText()).toBe('How are you?');
      expect(allMessages[3].getText()).toBe('Echo: How are you?');
    });

    it('should handle error scenarios gracefully', async () => {
      await service.initialize();

      // Set up a handler that throws errors
      service.setMessageHandler(async () => {
        throw new Error('Processing failed');
      });

      const testMessage = new TestMessage(
        {},
        'user',
        'Trigger error',
        'msg-error',
        new Date(),
        'general',
        'user-123',
        'TestUser'
      );

      await expect(service.simulateMessage(testMessage)).rejects.toThrow('Processing failed');
    });
  });
});
