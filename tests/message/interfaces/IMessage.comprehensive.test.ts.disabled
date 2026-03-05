import { IMessage } from '@src/message/interfaces/IMessage';

describe('IMessage Comprehensive', () => {
  it('should create message with all properties', () => {
    const message: IMessage = {
      id: 'msg123',
      content: 'Hello world',
      channelId: 'C123',
      userId: 'U123',
      userName: 'TestUser',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      platform: 'discord',
      metadata: {
        edited: false,
        reactions: [],
        threadId: 'thread123'
      }
    };

    expect(message.id).toBe('msg123');
    expect(message.content).toBe('Hello world');
    expect(message.platform).toBe('discord');
    expect(message.metadata?.threadId).toBe('thread123');
  });

  it('should create minimal message', () => {
    const message: IMessage = {
      id: 'msg456',
      content: 'Simple message',
      channelId: 'C456',
      userId: 'U456',
      userName: 'User',
      timestamp: new Date(),
      platform: 'slack'
    };

    expect(message.id).toBe('msg456');
    expect(message.platform).toBe('slack');
    expect(message.metadata).toBeUndefined();
  });

  it('should handle empty content', () => {
    const message: IMessage = {
      id: 'msg789',
      content: '',
      channelId: 'C789',
      userId: 'U789',
      userName: 'EmptyUser',
      timestamp: new Date(),
      platform: 'discord'
    };

    expect(message.content).toBe('');
    expect(message.id).toBe('msg789');
  });

  it('should handle unicode content', () => {
    const message: IMessage = {
      id: 'msg_unicode',
      content: '🚀 Hello 世界! 🌍',
      channelId: 'C_unicode',
      userId: 'U_unicode',
      userName: 'UnicodeUser',
      timestamp: new Date(),
      platform: 'slack'
    };

    expect(message.content).toBe('🚀 Hello 世界! 🌍');
  });

  it('should handle large content', () => {
    const largeContent = 'x'.repeat(5000);
    const message: IMessage = {
      id: 'msg_large',
      content: largeContent,
      channelId: 'C_large',
      userId: 'U_large',
      userName: 'LargeUser',
      timestamp: new Date(),
      platform: 'discord'
    };

    expect(message.content.length).toBe(5000);
  });

  it('should handle complex metadata', () => {
    const message: IMessage = {
      id: 'msg_complex',
      content: 'Complex message',
      channelId: 'C_complex',
      userId: 'U_complex',
      userName: 'ComplexUser',
      timestamp: new Date(),
      platform: 'slack',
      metadata: {
        edited: true,
        editedAt: new Date(),
        reactions: [
          { emoji: '👍', count: 5, users: ['U1', 'U2'] },
          { emoji: '❤️', count: 2, users: ['U3'] }
        ],
        threadId: 'thread_complex',
        parentId: 'parent123',
        mentions: ['U1', 'U2'],
        attachments: [
          { type: 'image', url: 'https://example.com/image.png' }
        ]
      }
    };

    expect(message.metadata?.edited).toBe(true);
    expect(message.metadata?.reactions).toHaveLength(2);
    expect(message.metadata?.mentions).toContain('U1');
  });

  it('should be serializable to JSON', () => {
    const message: IMessage = {
      id: 'msg_json',
      content: 'JSON message',
      channelId: 'C_json',
      userId: 'U_json',
      userName: 'JSONUser',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      platform: 'discord'
    };

    const json = JSON.stringify(message);
    const parsed = JSON.parse(json);

    expect(parsed.id).toBe('msg_json');
    expect(parsed.content).toBe('JSON message');
    expect(new Date(parsed.timestamp)).toEqual(message.timestamp);
  });

  it('should handle different platforms', () => {
    const platforms: Array<IMessage['platform']> = ['discord', 'slack'];
    
    platforms.forEach(platform => {
      const message: IMessage = {
        id: `msg_${platform}`,
        content: `Message from ${platform}`,
        channelId: `C_${platform}`,
        userId: `U_${platform}`,
        userName: `${platform}User`,
        timestamp: new Date(),
        platform
      };

      expect(message.platform).toBe(platform);
    });
  });
});