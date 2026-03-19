import axios, { type AxiosInstance } from 'axios';
import Debug from 'debug';

const debug = Debug('app:mattermost-client');

export interface MattermostConfig {
  serverUrl: string;
  token: string;
}

export default class MattermostClient {
  private axios: AxiosInstance;
  private connected: boolean = false;
  private me: any = null;

  constructor(config: MattermostConfig) {
    this.axios = axios.create({
      baseURL: `${config.serverUrl}/api/v4`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  public async connect(): Promise<void> {
    try {
      const response = await this.axios.get('/users/me');
      this.me = response.data;
      this.connected = true;
      debug('Connected to Mattermost as', this.me.username);
    } catch (error: any) {
      debug('Failed to connect to Mattermost:', error.message);
      this.connected = false;
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getCurrentUserId(): string | undefined {
    return this.me?.id;
  }

  public getCurrentUsername(): string | undefined {
    return this.me?.username;
  }

  public async postMessage(post: {
    channel: string;
    text: string;
    root_id?: string;
  }): Promise<any> {
    const response = await this.axios.post('/posts', {
      channel_id: post.channel,
      message: post.text,
      root_id: post.root_id,
    });
    return response.data;
  }

  public async getChannelPosts(channelId: string, page = 0, perPage = 10): Promise<any[]> {
    const response = await this.axios.get(`/channels/${channelId}/posts`, {
      params: { page, per_page: perPage },
    });
    // Mattermost returns { order: [...ids], posts: { id: post } }
    const { order, posts } = response.data;
    if (!order || !posts) return [];
    return order.map((id: string) => posts[id]);
  }

  public async getUser(userId: string): Promise<any> {
    try {
      const response = await this.axios.get(`/users/${userId}`);
      return response.data;
    } catch {
      return null;
    }
  }

  public async getChannelInfo(channelId: string): Promise<any> {
    const response = await this.axios.get(`/channels/${channelId}`);
    return response.data;
  }

  public async sendTyping(channelId: string, parentId?: string): Promise<void> {
    // Fire and forget typing event
    this.axios.post(`/channels/${channelId}/typing`, { parent_id: parentId }).catch(() => {});
  }
}
