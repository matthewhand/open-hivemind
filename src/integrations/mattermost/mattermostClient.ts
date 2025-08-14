// Minimal Mattermost client abstraction
// Provides a thin interface for REST-like calls and an event emitter hook
// so the service can register message handlers in a test-friendly way without
// requiring real network access.

import { EventEmitter } from 'events';
import Debug from 'debug';
import axios, { AxiosInstance } from 'axios';

const debug = Debug('app:MattermostClient');

interface MattermostClientOptions {
  serverUrl: string;
  token: string;
}

interface PostMessageOptions {
  channel: string;
  text: string;
}

export default class MattermostClient {
  serverUrl: string;
  token: string;
  private emitter: EventEmitter;
  private connected: boolean = false;
  private http: AxiosInstance;
  private ws: any;
  private wsPing?: NodeJS.Timeout;

  constructor(options: MattermostClientOptions) {
    this.serverUrl = options.serverUrl;
    this.token = options.token;
    this.emitter = new EventEmitter();
    this.http = axios.create({
      baseURL: this.serverUrl?.replace(/\/$/, '') || '',
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
    });
  }

  async connect(): Promise<void> {
    // Simulate connection lifecycle for tests / local dev
    this.connected = true;
    debug(`Connected (simulated) to Mattermost at ${this.serverUrl}`);
    // Try to establish a real websocket if ws is available at runtime
    try {
      // Gate by env flag to allow disable
      const wsEnabled = String(process.env.MATTERMOST_WS_ENABLED ?? 'true').toLowerCase() !== 'false';
      if (!wsEnabled) {
        debug('MATTERMOST_WS_ENABLED=false; skipping websocket');
        return;
      }
      // Lazy-require ws to avoid hard dependency in tests
      const WS = require('ws');
      const url = (this.serverUrl?.replace(/\/$/, '') || '') + '/api/v4/websocket';
      const headers: Record<string, string> = {};
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
      this.ws = new WS(url, undefined, { headers });

      this.ws.on('open', () => {
        debug('mattermost websocket open');
        // Keepalive ping to reduce idle disconnects
        this.wsPing = setInterval(() => {
          try { this.ws?.ping?.(); } catch {}
        }, 25000);
      });

      this.ws.on('message', (data: any) => {
        try {
          const text = typeof data === 'string' ? data : data?.toString?.() ?? '';
          const evt = JSON.parse(text);
          const type = evt?.event;
          const eData = evt?.data || {};
          const postStr = eData.post;
          let post: any = undefined;
          if (typeof postStr === 'string') {
            try { post = JSON.parse(postStr); } catch { post = undefined; }
          }
          if (!post) return;
          if (type === 'posted') this.emitter.emit('posted', post);
          else if (type === 'post_edited') this.emitter.emit('post_edited', post);
          else if (type === 'post_deleted') this.emitter.emit('post_deleted', post);
        } catch (e) {
          debug('ws message parse error', e);
        }
      });

      this.ws.on('error', (err: any) => {
        debug('mattermost websocket error', err?.message || err);
      });

      this.ws.on('close', () => {
        debug('mattermost websocket closed');
        if (this.wsPing) { clearInterval(this.wsPing); this.wsPing = undefined; }
        this.ws = undefined;
      });
    } catch (_e) {
      // ws module not present or cannot connect; continue in simulated mode
      debug('ws module unavailable or connection failed; continuing without realtime');
    }
    return;
  }

  async postMessage(options: PostMessageOptions): Promise<void> {
    if (!this.connected) {
      debug('postMessage called while disconnected; proceeding (simulated)');
    }
    debug(`Posting message to ${options.channel}: ${options.text?.slice(0, 80)}`);
    try {
      await this.http.post('/api/v4/posts', {
        channel_id: options.channel,
        message: options.text,
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || String(e);
      throw new Error(`Mattermost post failed: ${msg}`);
    }
  }

  // Minimal event subscription; handlers receive raw Mattermost post-like payloads
  on(event: 'posted' | 'post_edited' | 'post_deleted', handler: (data: any) => void): void {
    this.emitter.on(event, handler);
  }

  // For testing hooks: allow service to simulate inbound events
  emit(event: 'posted' | 'post_edited' | 'post_deleted', data: any): void {
    this.emitter.emit(event, data);
  }

  async getSelfUserId(): Promise<string> {
    try {
      const res = await this.http.get('/api/v4/users/me');
      return String(res.data?.id || '');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || String(e);
      throw new Error(`Mattermost getSelfUserId failed: ${msg}`);
    }
  }

  async joinChannel(channelId: string): Promise<void> {
    try {
      const me = await this.getSelfUserId();
      await this.http.post(`/api/v4/channels/${channelId}/members`, { user_id: me });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || String(e);
      throw new Error(`Mattermost joinChannel failed: ${msg}`);
    }
  }

  async getChannelPosts(channelId: string, perPage: number = 10): Promise<any[]> {
    try {
      const res = await this.http.get(`/api/v4/channels/${channelId}/posts`, {
        params: { page: 0, per_page: perPage },
      });
      const { order = [], posts = {} } = res.data || {};
      // order is newest-first array of post IDs; map to post objects
      const arr = Array.isArray(order) ? order.map((id: string) => posts[id]).filter(Boolean) : [];
      return arr;
    } catch (e: any) {
      debug('getChannelPosts error', e?.message || e);
      return [];
    }
  }

  async createPost(channelId: string, message: string, rootId?: string): Promise<string> {
    try {
      const payload: any = { channel_id: channelId, message };
      if (rootId) payload.root_id = rootId;
      const res = await this.http.post('/api/v4/posts', payload);
      return String(res.data?.id || '');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || String(e);
      throw new Error(`Mattermost createPost failed: ${msg}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.wsPing) { clearInterval(this.wsPing); this.wsPing = undefined; }
      if (this.ws && this.ws.readyState === this.ws.OPEN) {
        this.ws.close();
      }
      this.ws = undefined;
    } catch {}
    this.connected = false;
  }
}
