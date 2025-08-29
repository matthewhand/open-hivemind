import DiscordMessage from '@integrations/discord/DiscordMessage';

describe('DiscordMessageExtended Integration', () => {
  const createMockMessage = (overrides = {}) => ({
    id: 'msg-123',
    content: 'Test message',
    channelId: 'channel-123',
    createdAt: new Date(),
    author: {
      id: 'user-123',
      username: 'TestUser',
      bot: false
    },
    channel: {
      id: 'channel-123',
      topic: 'Test topic',
      members: new Map([
        ['user-1', { user: { id: 'user-1' } }],
        ['user-2', { user: { id: 'user-2' } }]
      ]),
      messages: {
        fetch: jest.fn().mockResolvedValue({
          id: 'ref-msg',
          content: 'Referenced message',
          author: { id: 'user-ref', username: 'RefUser', bot: false, discriminator: '0000' },
          channelId: 'channel-123',
          createdAt: new Date(),
          mentions: { users: new Map() },
          attachments: new Map(),
        })
      }
    },
    mentions: {
      users: new Map([['user-456', { id: 'user-456' }]])
    },
    reference: { messageId: 'ref-msg' },
    editable: true,
    edit: jest.fn().mockResolvedValue({ content: 'Updated' }),
    ...overrides
  });

  it('should create DiscordMessage with extended properties', () => {
    const mockMsg = createMockMessage();
    const discordMsg = new DiscordMessage(mockMsg as any);
    
    expect(discordMsg.getMessageId()).toBe('msg-123');
    expect(discordMsg.getText()).toBe('Test message');
    expect(discordMsg.getChannelId()).toBe('channel-123');
    expect(discordMsg.getAuthorId()).toBe('user-123');
  });

  it('should handle channel topic retrieval', () => {
    const mockMsg = createMockMessage();
    const discordMsg = new DiscordMessage(mockMsg as any);
    
    expect(discordMsg.getChannelTopic()).toBe('Test topic');
  });

  it('should handle user mentions', () => {
    const mockMsg = createMockMessage();
    const discordMsg = new DiscordMessage(mockMsg as any);
    
    expect(discordMsg.getUserMentions()).toContain('user-456');
  });

  it('should handle channel users', () => {
    const mockMsg = createMockMessage();
    const discordMsg = new DiscordMessage(mockMsg as any);
    
    const channelUsers = discordMsg.getChannelUsers();
    expect(channelUsers).toContain('user-1');
    expect(channelUsers).toContain('user-2');
  });

  it('should handle referenced messages', async () => {
    const mockMsg = createMockMessage();
    const discordMsg = new DiscordMessage(mockMsg as any);
    
    const referencedMsg = await discordMsg.getReferencedMessage();
    expect(referencedMsg).toBeInstanceOf(DiscordMessage);
    if (referencedMsg) {
      expect(referencedMsg.getMessageId()).toBe('ref-msg');
    }
  });

  it('should handle message editing', async () => {
    const mockMsg = createMockMessage();
    const discordMsg = new DiscordMessage(mockMsg as any);
    
    await discordMsg.setText('New content');
    expect(mockMsg.edit).toHaveBeenCalledWith('New content');
  });
});
