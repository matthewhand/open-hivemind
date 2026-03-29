import axios from 'axios';
import MattermostClient from '../../../packages/adapter-mattermost/src/mattermostClient';

jest.mock('axios');

describe('MattermostClient', () => {
  let client: MattermostClient;
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    const mockApi = {
      get: jest.fn(),
      post: jest.fn(),
    };

    mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.create = jest.fn().mockReturnValue(mockApi);

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
      status: 200,
      data: { username: 'testbot' },
    });

    await client.connect();

    expect(client.isConnected()).toBe(true);
  });

  it('should handle connection failure', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockRejectedValue(new Error('Network error'));

    await expect(client.connect()).rejects.toThrow('Mattermost connection failed');
  });

  it('should post message successfully', async () => {
    const mockApi = (client as any).api;
    mockApi.get.mockResolvedValue({
      status: 200,
      data: { username: 'testbot' },
    });
    mockApi.post.mockResolvedValue({
      data: { id: 'post123', message: 'Hello world' },
    });

    await client.connect();

    const result = await client.postMessage({
      channel: 'abcdefghijklmnopqrstuvwxyz',
      text: 'Hello world',
    });

    expect(result.id).toBe('post123');
  });

  it('should get channel posts', async () => {
    const mockApi = mockAxios.create();
    mockApi.get = jest.fn().mockResolvedValue({
      data: {
        posts: {
          post1: { id: 'post1', message: 'Message 1' },
          post2: { id: 'post2', message: 'Message 2' },
        },
      },
    });

    const posts = await client.getChannelPosts('channel123');

    expect(posts).toHaveLength(2);
  });

  it('should get user info', async () => {
    const mockApi = mockAxios.create();
    mockApi.get = jest.fn().mockResolvedValue({
      data: { id: 'user123', username: 'testuser' },
    });

    const user = await client.getUser('user123');

    expect(user?.username).toBe('testuser');
  });

  it('should handle user not found', async () => {
    const mockApi = mockAxios.create();
    mockApi.get = jest.fn().mockRejectedValue(new Error('Not found'));

    const user = await client.getUser('nonexistent');

    expect(user).toBeNull();
  });

  it('should get channel info', async () => {
    const mockApi = mockAxios.create();
    mockApi.get = jest.fn().mockResolvedValue({
      data: { id: 'channel123', name: 'general' },
    });

    const channel = await client.getChannel('channel123');

    expect(channel?.name).toBe('general');
  });

  it('should disconnect properly', () => {
    client.disconnect();
    expect(client.isConnected()).toBe(false);
  });

  it('should require connection for posting', async () => {
    await expect(
      client.postMessage({
        channel: 'test',
        text: 'test',
      })
    ).rejects.toThrow('Not connected to Mattermost server');
  });
});
