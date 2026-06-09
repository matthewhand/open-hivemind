/**
 * Tests for MattermostService.addBot() — hot-adding a bot into the running
 * service. Previously the only way to pick up a new bot was a full
 * re-initialize; addBot() must perform the same per-bot setup initialize()
 * does: create the client, connect it, refresh the resolved identity, and
 * subscribe the bot to an already-registered global message handler.
 */

jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: jest.fn().mockReturnValue([]) }),
  },
}));

const botConfig = {
  name: 'hotbot',
  messageProvider: 'mattermost',
  mattermost: {
    serverUrl: 'https://mm.example.com',
    token: 'tok',
    channel: 'town-square',
  },
};

describe('MattermostService.addBot', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  const load = async () => {
    const { default: MattermostClient } = await import('./mattermostClient');
    const { MattermostService } = await import('./MattermostService');
    return { MattermostClient, MattermostService };
  };

  it('creates the client, connects it, and registers it in the clients map', async () => {
    const { MattermostClient, MattermostService } = await load();
    const connect = jest.spyOn(MattermostClient.prototype, 'connect').mockResolvedValue(undefined);
    jest.spyOn(MattermostClient.prototype, 'getCurrentUserId').mockReturnValue('uid1');
    jest.spyOn(MattermostClient.prototype, 'getCurrentUsername').mockReturnValue('hotbot-user');

    const service = MattermostService.getInstance();
    expect(service.getBotNames()).not.toContain('hotbot');

    await service.addBot(botConfig);

    expect(service.getBotNames()).toContain('hotbot');
    expect(connect).toHaveBeenCalledTimes(1);
    // Identity resolved from the connected client is reflected in the config.
    const cfg = service.getBotConfig('hotbot');
    expect(cfg.userId).toBe('uid1');
    expect(cfg.username).toBe('hotbot-user');
    expect(cfg.serverUrl).toBe('https://mm.example.com');

    await service.shutdown();
  });

  it('subscribes a hot-added bot to a previously registered message handler', async () => {
    const { MattermostClient, MattermostService } = await load();
    jest.spyOn(MattermostClient.prototype, 'connect').mockResolvedValue(undefined);
    const onPost = jest.spyOn(MattermostClient.prototype, 'onPost');

    const service = MattermostService.getInstance();
    service.setMessageHandler(jest.fn().mockResolvedValue(''));

    await service.addBot(botConfig);

    // The new bot's client was wired to the incoming-post subscription.
    expect(onPost).toHaveBeenCalledTimes(1);

    await service.shutdown();
  });

  it('is idempotent per bot name: re-adding reconnects without duplicating', async () => {
    const { MattermostClient, MattermostService } = await load();
    const connect = jest.spyOn(MattermostClient.prototype, 'connect').mockResolvedValue(undefined);

    const service = MattermostService.getInstance();
    await service.addBot(botConfig);
    await service.addBot(botConfig);

    expect(service.getBotNames().filter((n) => n === 'hotbot')).toHaveLength(1);
    // Safe to use as a ReconnectionManager connect function: each call
    // re-validates the connection on the existing client.
    expect(connect).toHaveBeenCalledTimes(2);

    await service.shutdown();
  });

  it('rejects when the bot name is missing', async () => {
    const { MattermostService } = await load();
    const service = MattermostService.getInstance();

    await expect(
      service.addBot({ mattermost: { serverUrl: 'https://mm.example.com', token: 'tok' } })
    ).rejects.toThrow(/name/i);

    await service.shutdown();
  });

  it('rejects when serverUrl or token is missing', async () => {
    const { MattermostService } = await load();
    const service = MattermostService.getInstance();

    await expect(
      service.addBot({ name: 'broken', mattermost: { serverUrl: 'https://mm.example.com' } })
    ).rejects.toThrow(/serverUrl and token/);
    expect(service.getBotNames()).not.toContain('broken');

    await service.shutdown();
  });

  it('propagates connection failures so callers (ReconnectionManager) can retry', async () => {
    const { MattermostClient, MattermostService } = await load();
    jest
      .spyOn(MattermostClient.prototype, 'connect')
      .mockRejectedValue(new Error('connect refused'));

    const service = MattermostService.getInstance();
    await expect(service.addBot(botConfig)).rejects.toThrow('connect refused');

    await service.shutdown();
  });
});
