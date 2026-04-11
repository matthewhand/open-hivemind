import MattermostClient from '../../../packages/message-mattermost/src/mattermostClient';

jest.mock('@hivemind/shared-types', () => ({
  http: {
    create: jest.fn().mockReturnValue({
      get: jest.fn(),
      post: jest.fn()
    })
  },
  isSafeUrl: jest.fn().mockResolvedValue(true),
}));

jest.mock('@src/utils/ssrfGuard', () => ({
  isSafeUrl: jest.fn().mockResolvedValue(true),
}));

describe('MattermostClient', () => {
  let client: MattermostClient;

  beforeEach(() => {
    const mockApi = {
      get: jest.fn(),
      post: jest.fn(),
      defaults: { baseURL: 'https://mattermost.example.com/api/v4' },
    };

    client = new MattermostClient({
      serverUrl: 'https://mattermost.example.com',
      token: 'test-token',
    });

    (client as any).api = mockApi;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect successfully', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockResolvedValue({
      username: 'testbot'
    });

    await client.connect();

    expect(client.isConnected()).toBe(true);
  });

  it('should handle connection failure', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockRejectedValue(new Error('Network error'));

    await expect(client.connect()).rejects.toThrow('Network error');
  });

  it('should post message successfully', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockResolvedValue({
      username: 'testbot'
    });
    mockApi.post.mockResolvedValue({
      id: 'post123', message: 'Hello world'
    });

    await client.connect();

    const result = await client.postMessage({
      channel: 'abcdefghijklmnopqrstuvwxyz',
      text: 'Hello world',
    });

    expect(result.id).toBe('post123');
  });

  it('should get channel posts', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockResolvedValue({
      posts: {
        post1: { id: 'post1', message: 'Message 1' },
        post2: { id: 'post2', message: 'Message 2' },
      }
    });

    const posts = await client.getChannelPosts('channel123');

    expect(posts).toHaveLength(2);
  });

  it('should get user info', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockResolvedValue({
      id: 'user123', username: 'testuser'
    });

    const user = await client.getUser('user123');

    expect(user?.username).toBe('testuser');
  });

  it('should handle user not found', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockRejectedValue(new Error('Not found'));

    const user = await client.getUser('nonexistent');

    expect(user).toBeNull();
  });

  it('should get channel info', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockResolvedValue({
      id: 'abcdefghijklmnopqrstuvwxyz', name: 'general'
    });

    const channel = await client.getChannelInfo('abcdefghijklmnopqrstuvwxyz');

    expect(channel?.name).toBe('general');
  });
});
