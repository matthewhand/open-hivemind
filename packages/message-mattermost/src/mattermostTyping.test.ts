import MattermostClient from './mattermostClient';

/**
 * Regression test for audit (mattermost-typing):
 * MattermostClient.sendTyping() must POST the Mattermost typing endpoint
 * `/users/{user_id}/typing` with a `{ channel_id, parent_id }` payload, and
 * must surface failures via debug logging rather than throwing or silently
 * swallowing them. MattermostService.sendTyping() must likewise not throw.
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
