import axios, { AxiosInstance } from 'axios';
import { MattermostPost } from './MattermostMessage';

interface MattermostClientOptions {
  serverUrl: string;
  token: string;
}

interface PostMessageOptions {
  channel: string;
  text: string;
  root_id?: string;
  file_ids?: string[];
}

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Channel {
  id: string;
  name: string;
  display_name: string;
  type: string;
  team_id: string;
}

export default class MattermostClient {
  private serverUrl: string;
  private token: string;
  private api: AxiosInstance;
  private connected: boolean = false;

  constructor(options: MattermostClientOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, '');
    this.token = options.token;
    
    this.api = axios.create({
      baseURL: `${this.serverUrl}/api/v4`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  async connect(): Promise<void> {
    try {
      const response = await this.api.get('/users/me');
      if (response.status === 200) {
        this.connected = true;
        console.log(`Connected to Mattermost as ${response.data.username}`);
      }
    } catch (error: any) {
      console.error('Failed to connect to Mattermost:', error.message);
      throw new Error(`Mattermost connection failed: ${error.message}`);
    }
  }

  async postMessage(options: PostMessageOptions): Promise<MattermostPost> {
    if (!this.connected) {
      throw new Error('Not connected to Mattermost server');
    }

    try {
      const channelId = await this.resolveChannelId(options.channel);
      
      const response = await this.api.post('/posts', {
        channel_id: channelId,
        message: options.text,
        root_id: options.root_id,
        file_ids: options.file_ids || []
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to post message:', error.message);
      throw error;
    }
  }

  async getChannelPosts(channelId: string, page: number = 0, perPage: number = 60): Promise<MattermostPost[]> {
    try {
      const response = await this.api.get(`/channels/${channelId}/posts`, {
        params: { page, per_page: perPage }
      });
      
      const posts = response.data.posts;
      return Object.values(posts) as MattermostPost[];
    } catch (error: any) {
      console.error('Failed to get channel posts:', error.message);
      return [];
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const response = await this.api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    try {
      const response = await this.api.get(`/channels/${channelId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getChannelByName(teamId: string, channelName: string): Promise<Channel | null> {
    try {
      const response = await this.api.get(`/teams/${teamId}/channels/name/${channelName}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  private async resolveChannelId(channel: string): Promise<string> {
    if (channel.match(/^[a-z0-9]{26}$/)) {
      return channel;
    }
    
    try {
      const teamsResponse = await this.api.get('/users/me/teams');
      const teams = teamsResponse.data;
      
      for (const team of teams) {
        const channelData = await this.getChannelByName(team.id, channel);
        if (channelData) {
          return channelData.id;
        }
      }
    } catch (error) {
      console.error('Failed to resolve channel:', error);
    }
    
    throw new Error(`Channel not found: ${channel}`);
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
  }
}