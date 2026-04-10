import MattermostClient from '../../../packages/message-mattermost/src/mattermostClient';
import { http } from '@hivemind/shared-types';

jest.mock('@hivemind/shared-types', () => ({
  http: {
    create: jest.fn(),
  },
  createHttpClient: jest.fn(),
  isHttpError: jest.fn(),
}));

const mockHttp = http as jest.Mocked<typeof http>;

describe('MattermostClient', () => {
  let client: MattermostClient;
  let mockApi: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApi = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    mockHttp.create.mockReturnValue(mockApi);

    client = new MattermostClient({
      serverUrl: 'https://mattermost.example.com',
      token: 'test-token',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect successfully', async () => {
    mockApi.get.mockResolvedValue({ id: 'me', username: 'testbot' });

    await client.connect();

    expect(client.isConnected()).toBe(true);
  });

  it('should handle connection failure', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    await expect(client.connect()).rejects.toThrow('Network error');
  });

  it('should post message successfully', async () => {
    mockApi.get.mockResolvedValue({ id: 'me', username: 'testbot' });
    mockApi.post.mockResolvedValue({ id: 'post123', message: 'Hello world' });

    await client.connect();

    // Use a 26-char channel ID to bypass resolveChannelId lookup
    const result = await client.postMessage({
      channel: 'abcdefghijklmnopqrstuvwxyz',
      text: 'Hello world',
    });

    expect(result.id).toBe('post123');
  });

  it('should get channel posts', async () => {
    mockApi.get.mockResolvedValue({
      posts: {
        post1: { id: 'post1', message: 'Message 1' },
        post2: { id: 'post2', message: 'Message 2' },
      },
    });

    const posts = await client.getChannelPosts('channel123');

    expect(posts).toHaveLength(2);
  });

  it('should get user info', async () => {
    mockApi.get.mockResolvedValue({ id: 'user123', username: 'testuser' });

    const user = await client.getUser('user123');

    expect(user?.username).toBe('testuser');
  });

  it('should handle user not found', async () => {
    mockApi.get.mockRejectedValue(new Error('Not found'));

    const user = await client.getUser('nonexistent');

    expect(user).toBeNull();
  });

  it('should get channel info', async () => {
    mockApi.get.mockResolvedValue({ id: 'abcdefghijklmnopqrstuvwxyz', name: 'general' });

    // Use a 26-char channel ID to bypass resolveChannelId lookup
    const channel = await client.getChannelInfo('abcdefghijklmnopqrstuvwxyz');

    expect(channel?.name).toBe('general');
  });
});
