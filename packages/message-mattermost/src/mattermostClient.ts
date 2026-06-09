import {
  createHttpClient,
  http,
  isHttpError,
  type HttpClientInstance,
} from '@hivemind/shared-types';
import { Logger } from '@common/logger';
import type { MattermostPost } from './MattermostMessage';

const logger = Logger.withContext('MattermostClient');

interface MattermostClientOptions {
  serverUrl: string;
  token: string;
  /**
   * Optional WebSocket constructor injection (primarily for testing). Defaults
   * to the global `WebSocket` available in Node 22+.
   */
  webSocketFactory?: WebSocketFactory;
}

/** Minimal structural subset of the WHATWG WebSocket we rely on. */
export interface MinimalWebSocket {
  send(data: string): void;
  close(): void;
  onopen: ((this: unknown, ev: unknown) => unknown) | null;
  onmessage: ((this: unknown, ev: { data: unknown }) => unknown) | null;
  onerror: ((this: unknown, ev: unknown) => unknown) | null;
  onclose: ((this: unknown, ev: unknown) => unknown) | null;
}

export type WebSocketFactory = (url: string) => MinimalWebSocket;

/** Callback invoked for each incoming `posted` event on the WebSocket. */
export type PostEventHandler = (post: MattermostPost, channelType?: string) => void;

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
  creator_id?: string;
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

  private webSocketFactory?: WebSocketFactory;
  private ws: MinimalWebSocket | null = null;
  private wsSeq = 1;
  private postHandlers: Set<PostEventHandler> = new Set();
  private wsClosedByUser = false;

  constructor(options: MattermostClientOptions) {
    this.serverUrl = options.serverUrl.replace(/\/$/, '');
    this.token = options.token;
    this.webSocketFactory = options.webSocketFactory;

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

    // Open the realtime event stream so the bot can *receive* messages.
    // Failure here is non-fatal: REST send/fetch still work and we never
    // want a transient WS issue to crash bot startup.
    if (this.postHandlers.size > 0) {
      this.openWebSocket();
    }
  }

  /**
   * Registers a handler invoked for every incoming `posted` event delivered
   * over the Mattermost WebSocket. Registering the first handler will lazily
   * open the WebSocket if the client is already connected.
   *
   * @returns An unsubscribe function.
   */
  onPost(handler: PostEventHandler): () => void {
    this.postHandlers.add(handler);
    if (this.connected && !this.ws) {
      this.openWebSocket();
    }
    return () => {
      this.postHandlers.delete(handler);
    };
  }

  /**
   * Opens (or re-opens) the Mattermost WebSocket and authenticates with the
   * bot token. Incoming `posted` events are parsed and dispatched to all
   * registered post handlers. All errors are caught and logged so they can
   * never propagate into startup.
   */
  private openWebSocket(): void {
    if (this.ws) {
      return;
    }
    this.wsClosedByUser = false;

    const factory: WebSocketFactory =
      this.webSocketFactory ||
      ((url: string) => new (globalThis as any).WebSocket(url) as MinimalWebSocket);

    const wsUrl = `${this.serverUrl.replace(/^http/, 'ws')}/api/v4/websocket`;

    let ws: MinimalWebSocket;
    try {
      ws = factory(wsUrl);
    } catch (error: unknown) {
      logger.error('Failed to open Mattermost WebSocket', {
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            seq: this.wsSeq++,
            action: 'authentication_challenge',
            data: { token: this.token },
          })
        );
        logger.info('Mattermost WebSocket connected', { url: wsUrl });
      } catch (error: unknown) {
        logger.error('Failed to authenticate Mattermost WebSocket', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    ws.onmessage = (ev: { data: unknown }) => {
      try {
        this.handleWsMessage(ev.data);
      } catch (error: unknown) {
        logger.debug('Failed to handle Mattermost WebSocket message', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    ws.onerror = (ev: unknown) => {
      logger.error('Mattermost WebSocket error', {
        error: (ev as any)?.message ?? 'unknown',
      });
    };

    ws.onclose = () => {
      this.ws = null;
      if (!this.wsClosedByUser) {
        logger.info('Mattermost WebSocket closed');
      }
    };
  }

  /**
   * Parses a raw WebSocket frame and, when it is a `posted` event, dispatches
   * the embedded post to all registered handlers.
   */
  private handleWsMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }
    const event = JSON.parse(raw) as {
      event?: string;
      data?: { post?: string; channel_type?: string };
    };
    if (event.event !== 'posted' || !event.data?.post) {
      return;
    }

    let post: MattermostPost;
    try {
      post = JSON.parse(event.data.post) as MattermostPost;
    } catch {
      return;
    }

    for (const handler of this.postHandlers) {
      try {
        handler(post, event.data.channel_type);
      } catch (error: unknown) {
        logger.debug('Mattermost post handler threw', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
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
      const data = await this.api.get<{ posts: Record<string, MattermostPost> }>(
        `/channels/${channelId}/posts`,
        {
          params: { page, per_page: perPage },
        }
      );
      return Object.values(data.posts);
    } catch (error: any) {
      logger.error('Failed to get channel posts', { channelId, error: error.message });
      return [];
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      return await this.api.get<User>(`/users/${userId}`);
    } catch (error) {
      return null;
    }
  }

  async getChannel(channelId: string): Promise<Channel | null> {
    try {
      return await this.api.get<Channel>(`/channels/${channelId}`);
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
      return await this.api.get<Channel>(`/teams/${teamId}/channels/name/${channelName}`);
    } catch (error) {
      return null;
    }
  }

  async getTeams(): Promise<Team[]> {
    try {
      if (this.teamsCache && Date.now() - this.teamsCache.timestamp < this.CACHE_TTL) {
        return this.teamsCache.data;
      }
      const teams = await this.api.get<Team[]>('/users/me/teams');
      this.teamsCache = { data: teams, timestamp: Date.now() };
      return teams;
    } catch (error) {
      logger.error('Failed to fetch teams', { error });
      return [];
    }
  }

  async getChannels(): Promise<Channel[]> {
    try {
      const teams = await this.getTeams();
      const channelPromises = teams.map((team) =>
        this.api.get<Channel[]>(`/users/me/teams/${team.id}/channels`)
      );
      const results = await Promise.all(channelPromises);
      return results.flat();
    } catch (error) {
      logger.error('Failed to fetch channels', { error });
      return [];
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
    this.wsClosedByUser = true;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
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
      logger.debug('Mattermost typing indicator failed', {
        error: isHttpError(error) ? error.message : error,
      });
    }
  }
}
