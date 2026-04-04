import { Logger } from '@common/logger';
import { http, createHttpClient, isHttpError, type HttpClientInstance } from '@hivemind/shared-types';
import type { MattermostPost } from './MattermostMessage';

const logger = Logger.withContext('MattermostClient');

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
  is_bot?: boolean;
}

interface Channel {
  id: string;
  name: string;
  display_name: string;
  type: string;
  team_id: string;
  purpose?: string;
  header?: string;
}

interface Team {
  id: string;
  [key: string]: any;
}

export default class MattermostClient {
  private serverUrl: string;
  private token: string;
  private api: HttpClientInstance;
  private connected = false;
  private me: User | null = null;
  private teamsCache: { data: Team[]; timestamp: number } | null = null;
  private channelIdCache: Map<string, { id: string; timestamp: number }> = new Map();
  private pendingLookups: Map<string, Promise<string>> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;
  private readonly MAX_CACHE_SIZE = 1000;

  constructor(options: MattermostClientOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, '');
    this.token = options.token;

    this.api = http.create(`${this.serverUrl}/api/v4`, {
      Authorization: `Bearer ${this.token}`,
    });
  }

  async connect(): Promise<void> {
    try {
      const me = await this.api.get<User>('/users/me');
      this.connected = true;
      this.me = me;
      logger.info('Connected to Mattermost', { username: me.username });
    } catch (error: any) {
      logger.error('Failed to connect to Mattermost', { error: error.message });
      throw new Error(`Mattermost connection failed: ${error.message}`);
    }
  }

  async postMessage(options: PostMessageOptions): Promise<MattermostPost> {
    if (!this.connected) {
      throw new Error('Not connected to Mattermost server');
    }

    try {
      const channelId = await this.resolveChannelId(options.channel);

      return this.api.post<MattermostPost>('/posts', {
        channel_id: channelId,
        message: options.text,
        root_id: options.root_id,
        file_ids: options.file_ids || [],
      });
    } catch (error: any) {
      logger.error('Failed to post message', { error: error.message });
      throw error;
    }
  }

  async getChannelPosts(channelId: string, page = 0, perPage = 60): Promise<MattermostPost[]> {
    try {
      const data = await this.api.get<{ posts: Record<string, MattermostPost> }>(`/channels/${channelId}/posts`, {
        params: { page, per_page: perPage },
      });
      return Object.values(data.posts);
    } catch (error: any) {
      logger.error('Failed to get channel posts', { channelId, error: error.message });
      return [];
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      return this.api.get<User>(`/users/${userId}`);
    } catch (error) {
      return null;
    }
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    try {
      return this.api.get<Channel>(`/channels/${channelId}`);
    } catch (error) {
      return null;
    }
  }

  async getChannelInfo(channel: string): Promise<Channel | null> {
    try {
      const channelId = await this.resolveChannelId(channel);
      return await this.getChannel(channelId);
    } catch {
      return null;
    }
  }

  async getChannelByName(teamId: string, channelName: string): Promise<Channel | null> {
    try {
      return this.api.get<Channel>(`/teams/${teamId}/channels/name/${channelName}`);
    } catch (error) {
      return null;
    }
  }

  private async resolveChannelId(channel: string): Promise<string> {
    if (channel.match(/^[a-z0-9]{26}$/)) {
      return channel;
    }

    const cachedChannel = this.channelIdCache.get(channel);
    if (cachedChannel && Date.now() - cachedChannel.timestamp < this.CACHE_TTL) {
      return cachedChannel.id;
    }

    const pending = this.pendingLookups.get(channel);
    if (pending) {
      return pending;
    }

    const lookupPromise = (async (): Promise<string> => {
      try {
        let teams: Team[];
        if (this.teamsCache && Date.now() - this.teamsCache.timestamp < this.CACHE_TTL) {
          teams = this.teamsCache.data;
        } else {
          this.teamsCache = null;
          teams = await this.api.get<Team[]>('/users/me/teams');
          this.teamsCache = { data: teams, timestamp: Date.now() };
        }

        const channelPromises = teams.map((team) => this.getChannelByName(team.id, channel));
        const results = await Promise.all(channelPromises);
        const foundChannel = results.find((c) => !!c);

        if (foundChannel) {
          if (this.channelIdCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.channelIdCache.keys().next().value;
            if (firstKey) this.channelIdCache.delete(firstKey);
          }
          this.channelIdCache.set(channel, { id: foundChannel.id, timestamp: Date.now() });
          return foundChannel.id;
        }

        throw new Error(`Channel not found: ${channel}`);
      } catch (error) {
        logger.error('Failed to resolve channel', { channel, error });
        throw error;
      } finally {
        this.pendingLookups.delete(channel);
      }
    })();

    this.pendingLookups.set(channel, lookupPromise);
    return lookupPromise;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
    this.teamsCache = null;
    this.channelIdCache.clear();
    this.pendingLookups.clear();
  }

  getCurrentUserId(): string | null {
    return this.me?.id || null;
  }

  getCurrentUsername(): string | null {
    return this.me?.username || null;
  }

  /**
   * Best-effort typing indicator (requires server support for /users/{id}/typing).
   */
  async sendTyping(channelId: string, parentId?: string): Promise<void> {
    if (!this.connected) {
      return;
    }
    const userId = this.getCurrentUserId();
    if (!userId) {
      return;
    }
    try {
      await this.api.post(`/users/${userId}/typing`, {
        channel_id: channelId,
        parent_id: parentId || '',
      });
    } catch (error: unknown) {
      logger.debug('Mattermost typing indicator failed', { error: isHttpError(error) ? error.message : error });
    }
  }
}
