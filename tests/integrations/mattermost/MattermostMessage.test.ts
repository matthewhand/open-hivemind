import { MattermostMessage, MattermostPost } from '@src/integrations/mattermost/MattermostMessage';

describe('MattermostMessage', () => {
  let mockPost: MattermostPost;

  beforeEach(() => {
    mockPost = {
      id: 'post123',
      message: 'Hello world',
      channel_id: 'channel123',
      user_id: 'user123',
      create_at: 1640995200000, // 2022-01-01 00:00:00
      update_at: 1640995200000,
      edit_at: 0,
      delete_at: 0,
      is_pinned: false,
      type: 'regular',
      props: {},
      hashtags: '#test #mattermost',
      pending_post_id: '',
      reply_count: 2,
      metadata: {}
    };
  });

  it('should convert to IMessage correctly', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.id).toBe('post123');
    expect(iMessage.content).toBe('Hello world');
    expect(iMessage.channelId).toBe('channel123');
    expect(iMessage.userId).toBe('user123');
    expect(iMessage.userName).toBe('TestUser');
    expect(iMessage.platform).toBe('mattermost');
    expect(iMessage.timestamp).toEqual(new Date(1640995200000));
  });

  it('should handle edited messages', () => {
    mockPost.edit_at = 1640995260000; // 1 minute later
    
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.metadata?.edited).toBe(true);
    expect(iMessage.metadata?.editedAt).toEqual(new Date(1640995260000));
  });

  it('should handle pinned messages', () => {
    mockPost.is_pinned = true;
    
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.metadata?.isPinned).toBe(true);
  });

  it('should parse hashtags correctly', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.metadata?.hashtags).toEqual(['#test', '#mattermost']);
  });

  it('should handle empty hashtags', () => {
    mockPost.hashtags = '';
    
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.metadata?.hashtags).toEqual([]);
  });

  it('should include reply count', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.metadata?.replyCount).toBe(2);
  });

  it('should handle unknown username', () => {
    const mattermostMsg = new MattermostMessage(mockPost);
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.userName).toBe('Unknown');
  });

  it('should provide getter methods', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.getId()).toBe('post123');
    expect(mattermostMsg.getContent()).toBe('Hello world');
    expect(mattermostMsg.getChannelId()).toBe('channel123');
    expect(mattermostMsg.getUserId()).toBe('user123');
    expect(mattermostMsg.getUsername()).toBe('TestUser');
    expect(mattermostMsg.isEdited()).toBe(false);
    expect(mattermostMsg.isPinned()).toBe(false);
    expect(mattermostMsg.getReplyCount()).toBe(2);
  });

  it('should detect edited messages', () => {
    mockPost.edit_at = 1640995260000;
    
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.isEdited()).toBe(true);
  });

  it('should handle message props', () => {
    mockPost.props = { custom_field: 'value', attachments: [] };
    
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');
    const iMessage = mattermostMsg.toIMessage();

    expect(iMessage.metadata?.props).toEqual({ custom_field: 'value', attachments: [] });
  });
});