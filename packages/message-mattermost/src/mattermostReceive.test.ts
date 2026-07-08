import MattermostClient, { type MinimalWebSocket } from './mattermostClient';

/**
 * Regression test for audit #1 (mattermost-receive):
 * MattermostService.setMessageHandler() used to be a no-op and MattermostClient
 * had no WebSocket subscription, so Mattermost bots could send but never receive.
 *
 * These tests assert that:
 *  1. MattermostClient.onPost() subscribes to the WebSocket and dispatches
 *     parsed `posted` events to its handler.
 *  2. MattermostService.setMessageHandler() wires that subscription so an
 *     incoming post invokes the registered handler with a MattermostMessage.
 */

jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: jest.fn().mockReturnValue([]) }),
  },
}));

/** A controllable fake WebSocket for deterministic tests. */
class FakeWebSocket implements MinimalWebSocket {
  public sent: string[] = [];
  public closed = false;
  onopen: ((this: unknown, ev: unknown) => unknown) | null = null;
  onmessage: ((this: unknown, ev: { data: unknown }) => unknown) | null = null;
  onerror: ((this: unknown, ev: unknown) => unknown) | null = null;
  onclose: ((this: unknown, ev: unknown) => unknown) | null = null;

  constructor(public url: string) {}

  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
    this.onclose?.call(this, {});
  }
  // Test helpers
  open(): void {
    this.onopen?.call(this, {});
  }
  emit(raw: string): void {
    this.onmessage?.call(this, { data: raw });
  }
}

const buildPost = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'post123',
  message: 'hello bot',
  channel_id: 'chan1',
  user_id: 'user1',
  create_at: Date.now(),
  update_at: 0,
  edit_at: 0,
  delete_at: 0,
  is_pinned: false,
  type: '',
  props: {},
  hashtags: '',
  pending_post_id: '',
  reply_count: 0,
  metadata: {},
  ...over,
});

const postedFrame = (post: ReturnType<typeof buildPost>) =>
  JSON.stringify({ event: 'posted', data: { post: JSON.stringify(post), channel_type: 'O' } });

describe('MattermostClient WebSocket receive', () => {
  it('authenticates and dispatches posted events to onPost handlers', async () => {
    let fake: FakeWebSocket | undefined;
    const client = new MattermostClient({
      serverUrl: 'https://mm.example.com',
      token: 'tok',
      webSocketFactory: (url) => (fake = new FakeWebSocket(url)),
    });

    // Simulate a successful REST connect without hitting the network.
    (client as unknown as { connected: boolean }).connected = true;

    const received: any[] = [];
    client.onPost((post) => received.push(post));

    expect(fake).toBeDefined();
    expect(fake!.url).toBe('wss://mm.example.com/api/v4/websocket');

    fake!.open();
    // First frame must be the auth challenge carrying the token.
    expect(fake!.sent.length).toBe(1);
    const auth = JSON.parse(fake!.sent[0]);
    expect(auth.action).toBe('authentication_challenge');
    expect(auth.data.token).toBe('tok');

    fake!.emit(postedFrame(buildPost({ message: 'hi there' })));

    expect(received).toHaveLength(1);
    expect(received[0].message).toBe('hi there');
  });

  it('ignores non-posted events', () => {
    let fake: FakeWebSocket | undefined;
    const client = new MattermostClient({
      serverUrl: 'http://mm.local',
      token: 'tok',
      webSocketFactory: (url) => (fake = new FakeWebSocket(url)),
    });
    (client as unknown as { connected: boolean }).connected = true;

    const received: any[] = [];
    client.onPost((post) => received.push(post));
    fake!.open();
    fake!.emit(JSON.stringify({ event: 'typing', data: {} }));
    expect(received).toHaveLength(0);
    // ws url derived from http -> ws
    expect(fake!.url).toBe('ws://mm.local/api/v4/websocket');
  });
});

describe('MattermostService.setMessageHandler subscribes to incoming posts', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('invokes the registered handler when a post arrives over the WebSocket', async () => {
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();

    let fake: FakeWebSocket | undefined;
    const client = new MattermostClient({
      serverUrl: 'https://mm.example.com',
      token: 'tok',
      webSocketFactory: (url) => (fake = new FakeWebSocket(url)),
    });
    (client as unknown as { connected: boolean }).connected = true;
    // Avoid a network call for user resolution.
    jest.spyOn(client, 'getUser').mockResolvedValue({
      id: 'user1',
      username: 'alice',
      email: '',
      first_name: 'Alice',
      last_name: '',
      is_bot: false,
    } as any);
    jest.spyOn(client, 'getCurrentUserId').mockReturnValue('botUser');

    // Inject our client and config into the singleton.
    (service as any).clients.set('bot1', client);
    (service as any).botConfigs.set('bot1', { name: 'bot1', userId: 'botUser' });

    const handler = jest.fn().mockResolvedValue('');
    service.setMessageHandler(handler);

    fake!.open();
    fake!.emit(postedFrame(buildPost({ message: 'ping', user_id: 'user1' })));

    // Allow the async user-resolution + handler invocation to settle.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    const msgArg = handler.mock.calls[0][0];
    expect(msgArg.getText()).toBe('ping');
    expect(msgArg.getChannelId()).toBe('chan1');

    await service.shutdown();
  });

  it('ignores the bot own posts to avoid feedback loops', async () => {
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();

    let fake: FakeWebSocket | undefined;
    const client = new MattermostClient({
      serverUrl: 'https://mm.example.com',
      token: 'tok',
      webSocketFactory: (url) => (fake = new FakeWebSocket(url)),
    });
    (client as unknown as { connected: boolean }).connected = true;
    jest.spyOn(client, 'getCurrentUserId').mockReturnValue('botUser');

    (service as any).clients.set('bot1', client);
    (service as any).botConfigs.set('bot1', { name: 'bot1', userId: 'botUser' });

    const handler = jest.fn().mockResolvedValue('');
    service.setMessageHandler(handler);

    fake!.open();
    fake!.emit(postedFrame(buildPost({ user_id: 'botUser' })));

    await new Promise((r) => setTimeout(r, 0));
    expect(handler).not.toHaveBeenCalled();

    await service.shutdown();
  });
});
