import axios from 'axios';
import MattermostClient from '../../../packages/message-mattermost/src/mattermostClient';

const mockedGet = jest.fn();
const mockedPost = jest.fn();

jest.mock('@hivemind/shared-types', () => ({
  ...jest.requireActual('@hivemind/shared-types'),
  isSafeUrl: jest.fn().mockResolvedValue(true),
  http: {
    create: () => ({
      get: mockedGet,
      post: mockedPost,
      defaults: { baseURL: 'https://mattermost.example.com/api/v4' },
    }),
  }
}));

jest.mock('@src/utils/ssrfGuard', () => ({
  isSafeUrl: jest.fn().mockResolvedValue(true),
}));

describe('MattermostClient', () => {
  let client: MattermostClient;

  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();

    client = new MattermostClient({
      serverUrl: 'https://mattermost.example.com',
      token: 'test-token',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect successfully', async () => {
    mockedGet.mockResolvedValue({ username: 'testbot' });

    await client.connect();

    expect(client.isConnected()).toBe(true);
  });

  it('should handle connection failure', async () => {
    mockedGet.mockRejectedValue(new Error('Network error'));

    await expect(client.connect()).rejects.toThrow('Network error');
  });

  it('should post message successfully', async () => {
    mockedGet.mockResolvedValue({ username: 'testbot' });
    mockedPost.mockResolvedValue({ id: 'post123', message: 'Hello world' });

    await client.connect();

    const result = await client.postMessage({
      channel: 'abcdefghijklmnopqrstuvwxyz',
      text: 'Hello world',
    });

    expect(result.id).toBe('post123');
  });

  it('should get channel posts', async () => {
    mockedGet.mockResolvedValue({
      posts: {
        post1: { id: 'post1', message: 'Message 1' },
        post2: { id: 'post2', message: 'Message 2' },
      },
    });

    const posts = await client.getChannelPosts('channel123');

    expect(posts).toHaveLength(2);
  });

  it('should get user info', async () => {
    mockedGet.mockResolvedValue({ id: 'user123', username: 'testuser' });

    const user = await client.getUser('user123');

    expect(user?.username).toBe('testuser');
  });

  it('should handle user not found', async () => {
    mockedGet.mockRejectedValue(new Error('Not found'));

    const user = await client.getUser('nonexistent');

    expect(user).toBeNull();
  });

  it('should get channel info', async () => {
    mockedGet.mockResolvedValue({ id: 'abcdefghijklmnopqrstuvwxyz', name: 'general' });

    const channel = await client.getChannelInfo('abcdefghijklmnopqrstuvwxyz');

    expect(channel?.name).toBe('general');
  });
});
