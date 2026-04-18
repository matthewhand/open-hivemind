import axios from 'axios';
import MattermostClient from '../../../packages/message-mattermost/src/mattermostClient';

jest.mock('@hivemind/shared-types', () => {
  const original = jest.requireActual('@hivemind/shared-types');
  return {
    ...original,
    isSafeUrl: jest.fn().mockResolvedValue(true),
    http: {
      create: jest.fn(),
    },
  };
});

import { http } from '@hivemind/shared-types';

describe('MattermostClient', () => {
  let client: MattermostClient;
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      get: jest.fn(),
      post: jest.fn(),
    };

    (http.create as jest.Mock).mockReturnValue(mockApi);

    client = new MattermostClient({
      serverUrl: 'https://mattermost.example.com',
      token: 'test-token',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect successfully', async () => {
    mockApi.get.mockResolvedValue({ username: 'testbot' });

    await client.connect();

    expect(client.isConnected()).toBe(true);
  });

  it('should handle connection failure', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    await expect(client.connect()).rejects.toThrow('Network error');
  });

  it('should post message successfully', async () => {
    mockApi.get.mockResolvedValue({ username: 'testbot' });
    mockApi.post.mockResolvedValue({ id: 'post123', message: 'Hello world' });

    await client.connect();

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

    const channel = await client.getChannelInfo('abcdefghijklmnopqrstuvwxyz');

    expect(channel?.name).toBe('general');
  });
});
