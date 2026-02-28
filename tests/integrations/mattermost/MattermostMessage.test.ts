import {
  MattermostMessage,
  MattermostPost,
} from '../../../packages/adapter-mattermost/src/MattermostMessage';

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
      metadata: {},
    };
  });

  it('should convert to IMessage correctly', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.getMessageId()).toBe('post123');
    expect(mattermostMsg.content).toBe('Hello world');
    expect(mattermostMsg.channelId).toBe('channel123');
    expect(mattermostMsg.getAuthorId()).toBe('user123');
    expect(mattermostMsg.getAuthorName()).toBe('TestUser');
    expect(mattermostMsg.getTimestamp()).toEqual(new Date(1640995200000));
  });

  it('should handle edited messages', () => {
    mockPost.edit_at = 1640995260000; // 1 minute later

    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.metadata?.edited).toBe(true);
    expect(mattermostMsg.metadata?.editedAt).toEqual(new Date(1640995260000));
  });

  it('should handle pinned messages', () => {
    mockPost.is_pinned = true;

    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.metadata?.isPinned).toBe(true);
  });

  it('should parse hashtags correctly', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.metadata?.hashtags).toEqual(['#test', '#mattermost']);
  });

  it('should handle empty hashtags', () => {
    mockPost.hashtags = '';

    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.metadata?.hashtags).toEqual([]);
  });

  it('should include reply count', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.metadata?.replyCount).toBe(2);
  });

  it('should handle unknown username', () => {
    const mattermostMsg = new MattermostMessage(mockPost);

    expect(mattermostMsg.getAuthorName()).toBe('Unknown');
  });

  it('should provide getter methods', () => {
    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.getMessageId()).toBe('post123');
    expect(mattermostMsg.content).toBe('Hello world');
    expect(mattermostMsg.getChannelId()).toBe('channel123');
    expect(mattermostMsg.getAuthorId()).toBe('user123');
    expect(mattermostMsg.getAuthorName()).toBe('TestUser');
    expect(mattermostMsg.metadata?.edited).toBe(false);
    expect(mattermostMsg.metadata?.isPinned).toBe(false);
    expect(mattermostMsg.metadata?.replyCount).toBe(2);
  });

  it('should detect edited messages', () => {
    mockPost.edit_at = 1640995260000;

    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.metadata?.edited).toBe(true);
  });

  it('should handle message props', () => {
    mockPost.props = { custom_field: 'value', attachments: [] };

    const mattermostMsg = new MattermostMessage(mockPost, 'TestUser');

    expect(mattermostMsg.metadata?.props).toEqual({ custom_field: 'value', attachments: [] });
  });
});
