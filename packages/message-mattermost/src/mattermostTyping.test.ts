import MattermostClient from './mattermostClient';

/**
 * Regression test for audit (mattermost-typing):
 * MattermostClient.sendTyping() must prefer the realtime WebSocket channel
 * (Mattermost `user_typing` action) when the WS is open, and otherwise fall
 * back to POSTing the REST typing endpoint `/users/{user_id}/typing` with a
 * `{ channel_id, parent_id }` payload. Failures must surface via debug
 * logging rather than throwing or being silently swallowed.
 * MattermostService.sendTyping() must likewise not throw.
 */

jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: jest.fn().mockReturnValue([]) }),
  },
}));

describe('MattermostClient.sendTyping', () => {
  const build = () => {
    const client = new MattermostClient({ serverUrl: 'https://mm.example.com', token: 'tok' });
    (client as unknown as { connected: boolean }).connected = true;
    jest.spyOn(client, 'getCurrentUserId').mockReturnValue('botUser');
    const post = jest.fn().mockResolvedValue(undefined);
    (client as unknown as { api: { post: typeof post } }).api = { post } as never;
    return { client, post };
  };

  /** Attaches a fake open WebSocket to the client. */
  const attachOpenWs = (client: MattermostClient) => {
    const send = jest.fn();
    (client as unknown as { ws: { send: typeof send } }).ws = { send } as never;
    (client as unknown as { wsOpen: boolean }).wsOpen = true;
    return { send };
  };

  it('sends a user_typing action over the WebSocket when it is open', async () => {
    const { client, post } = build();
    const { send } = attachOpenWs(client);

    await client.sendTyping('chan1', 'root42');

    expect(send).toHaveBeenCalledTimes(1);
    const frame = JSON.parse(send.mock.calls[0][0] as string);
    expect(frame).toMatchObject({
      action: 'user_typing',
      data: { channel_id: 'chan1', parent_id: 'root42' },
    });
    expect(typeof frame.seq).toBe('number');
    // WS path must not also hit the REST endpoint.
    expect(post).not.toHaveBeenCalled();
  });

  it('defaults parent_id to empty string on the WebSocket path', async () => {
    const { client } = build();
    const { send } = attachOpenWs(client);

    await client.sendTyping('chan1');

    const frame = JSON.parse(send.mock.calls[0][0] as string);
    expect(frame.data).toEqual({ channel_id: 'chan1', parent_id: '' });
  });

  it('falls back to REST when the WebSocket send throws', async () => {
    const { client, post } = build();
    const { send } = attachOpenWs(client);
    send.mockImplementation(() => {
      throw new Error('ws broken');
    });

    await expect(client.sendTyping('chan1', 'root42')).resolves.toBeUndefined();

    expect(post).toHaveBeenCalledWith('/users/botUser/typing', {
      channel_id: 'chan1',
      parent_id: 'root42',
    });
  });

  it('uses REST when the WebSocket exists but is not open', async () => {
    const { client, post } = build();
    const { send } = attachOpenWs(client);
    (client as unknown as { wsOpen: boolean }).wsOpen = false;

    await client.sendTyping('chan1');

    expect(send).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('POSTs the correct typing endpoint and payload', async () => {
    const { client, post } = build();

    await client.sendTyping('chan1', 'root42');

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/users/botUser/typing', {
      channel_id: 'chan1',
      parent_id: 'root42',
    });
  });

  it('defaults parent_id to empty string when no thread id is supplied', async () => {
    const { client, post } = build();

    await client.sendTyping('chan1');

    expect(post).toHaveBeenCalledWith('/users/botUser/typing', {
      channel_id: 'chan1',
      parent_id: '',
    });
  });

  it('does not POST when the client is not connected', async () => {
    const { client, post } = build();
    (client as unknown as { connected: boolean }).connected = false;

    await client.sendTyping('chan1');

    expect(post).not.toHaveBeenCalled();
  });

  it('swallows POST failures (best-effort) instead of throwing', async () => {
    const { client, post } = build();
    post.mockRejectedValue(new Error('boom'));

    await expect(client.sendTyping('chan1')).resolves.toBeUndefined();
  });
});

describe('MattermostService.sendTyping', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('delegates to the resolved client and surfaces failures without throwing', async () => {
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();

    const failing = {
      sendTyping: jest.fn().mockRejectedValue(new Error('network down')),
    };
    (service as unknown as { clients: Map<string, unknown> }).clients.set('bot1', failing);

    // Must not throw even though the underlying client rejects.
    await expect(service.sendTyping('chan1', 'bot1', 'thread1')).resolves.toBeUndefined();
    expect(failing.sendTyping).toHaveBeenCalledWith('chan1', 'thread1');

    await service.shutdown();
  });
});
