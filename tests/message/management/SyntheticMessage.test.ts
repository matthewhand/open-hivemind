import { SyntheticMessage } from '@message/management/SyntheticMessage';
import { IMessage } from '@message/interfaces/IMessage';
import { IMessengerService } from '@message/interfaces/IMessengerService';

// Create a mock messenger service
const mockMessengerService = {
  getName: jest.fn().mockReturnValue('test-messenger'),
  getMessagesFromChannel: jest.fn(),
  sendMessageToChannel: jest.fn(),
} as any;

// Create a mock original message
class MockOriginalMessage extends IMessage {
  constructor(content: string = 'original content') {
    super({}, 'user');
    this.content = content;
    this.channelId = 'test-channel-123';
  }

  getMessageId(): string {
    return 'original-message-id';
  }

  getTimestamp(): Date {
    return new Date('2023-01-01');
  }

  setText(text: string): void {
    this.content = text;
  }

  getChannelId(): string {
    return this.channelId;
  }

  getAuthorId(): string {
    return 'original-user-id';
  }

  getChannelTopic(): string | null {
    return 'Test Channel Topic';
  }

  getUserMentions(): string[] {
    return ['user1', 'user2'];
  }

  getChannelUsers(): string[] {
    return ['user1', 'user2', 'user3'];
  }

  mentionsUsers(userId: string): boolean {
    return userId === 'user1';
  }

  isFromBot(): boolean {
    return false;
  }

  getAuthorName(): string {
    return 'Original User';
  }
}

describe('SyntheticMessage', () => {
  let originalMessage: MockOriginalMessage;
  let syntheticMessage: SyntheticMessage;

  beforeEach(() => {
    originalMessage = new MockOriginalMessage('original test content');
    syntheticMessage = new SyntheticMessage(originalMessage, 'synthetic test content');
  });

  describe('constructor', () => {
    it('should create a synthetic message with provided content', () => {
      expect(syntheticMessage.content).toBe('synthetic test content');
      expect(syntheticMessage.getText()).toBe('synthetic test content');
    });

    it('should inherit properties from original message', () => {
      expect(syntheticMessage.getChannelId()).toBe('test-channel-123');
      expect(syntheticMessage.getAuthorId()).toBe('idle_response_system');
      expect(syntheticMessage.getAuthorName()).toBe('System');
    });

    it('should have system role', () => {
      expect(syntheticMessage.role).toBe('system');
    });
  });

  describe('getMessageId', () => {
    it('should return synthetic message ID', () => {
      const messageId = syntheticMessage.getMessageId();
      expect(messageId).toMatch(/^synthetic-/);
      expect(messageId).toContain('test-channel-123');
    });
  });

  describe('getTimestamp', () => {
    it('should return current timestamp', () => {
      // Allow small clock/timing skew to avoid flaky failures
      const skewMs = 10;

      const before = Date.now() - skewMs;
      const timestamp = syntheticMessage.getTimestamp();
      const after = Date.now() + skewMs;
      
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(timestamp.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('setText', () => {
    it('should update content', () => {
      syntheticMessage.setText('updated synthetic content');
      expect(syntheticMessage.content).toBe('updated synthetic content');
      expect(syntheticMessage.getText()).toBe('updated synthetic content');
    });
  });

  describe('getChannelId', () => {
    it('should return original channel ID', () => {
      expect(syntheticMessage.getChannelId()).toBe('test-channel-123');
    });
  });

  describe('getAuthorId', () => {
    it('should return system author ID', () => {
      expect(syntheticMessage.getAuthorId()).toBe('idle_response_system');
    });
  });

  describe('getChannelTopic', () => {
    it('should return original channel topic', () => {
      expect(syntheticMessage.getChannelTopic()).toBe('Test Channel Topic');
    });
  });

  describe('getUserMentions', () => {
    it('should return empty array for system messages', () => {
      expect(syntheticMessage.getUserMentions()).toEqual([]);
    });
  });

  describe('getChannelUsers', () => {
    it('should return original channel users', () => {
      expect(syntheticMessage.getChannelUsers()).toEqual(['user1', 'user2', 'user3']);
    });
  });

  describe('mentionsUsers', () => {
    it('should always return false for system messages', () => {
      expect(syntheticMessage.mentionsUsers('user1')).toBe(false);
      expect(syntheticMessage.mentionsUsers('nonexistent')).toBe(false);
    });
  });

  describe('isFromBot', () => {
    it('should always return true for system messages', () => {
      expect(syntheticMessage.isFromBot()).toBe(true);
    });
  });

  describe('getAuthorName', () => {
    it('should return system author name', () => {
      expect(syntheticMessage.getAuthorName()).toBe('System');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const emptyMessage = new SyntheticMessage(originalMessage, '');
      expect(emptyMessage.content).toBe('');
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(1000);
      const longMessage = new SyntheticMessage(originalMessage, longContent);
      expect(longMessage.content).toBe(longContent);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Hello! @#$%^&*()_+{}[]|\\:;"\'<>?,./';
      const specialMessage = new SyntheticMessage(originalMessage, specialContent);
      expect(specialMessage.content).toBe(specialContent);
    });

    it('should handle null/undefined original message properties gracefully', () => {
      const minimalOriginal = new MockOriginalMessage('');
      minimalOriginal.getChannelTopic = () => null;
      minimalOriginal.getChannelUsers = () => [];
      
      const synthetic = new SyntheticMessage(minimalOriginal, 'test');
      
      expect(synthetic.getChannelTopic()).toBe(null);
      expect(synthetic.getChannelUsers()).toEqual([]);
    });
  });
});