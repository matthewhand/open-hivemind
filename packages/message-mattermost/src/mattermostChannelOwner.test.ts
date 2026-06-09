/**
 * Regression test for MattermostService.getChannelOwnerId:
 * it previously returned '' unconditionally even though the channel info
 * (including `creator_id`) was already fetched. It must now surface the
 * channel creator's user id, while keeping the empty-string fallback for
 * missing channels, missing creator ids, and client errors.
 */

jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: jest.fn().mockReturnValue([]) }),
  },
}));

describe('MattermostService.getChannelOwnerId', () => {
  afterEach(() => {
    jest.resetModules();
  });

  const buildService = async (client: unknown) => {
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();
    (service as unknown as { clients: Map<string, unknown> }).clients.set('bot1', client);
    return service;
  };

  it('returns the channel creator_id from getChannelInfo', async () => {
    const client = {
      getChannelInfo: jest.fn().mockResolvedValue({
        id: 'chan1',
        name: 'town-square',
        display_name: 'Town Square',
        type: 'O',
        team_id: 'team1',
        creator_id: 'user-42',
      }),
    };
    const service = await buildService(client);

    await expect(service.getChannelOwnerId('chan1')).resolves.toBe('user-42');
    expect(client.getChannelInfo).toHaveBeenCalledWith('chan1');

    await service.shutdown();
  });

  it('returns empty string when the channel has no creator_id', async () => {
    const client = {
      getChannelInfo: jest.fn().mockResolvedValue({
        id: 'dm1',
        name: 'dm',
        display_name: '',
        type: 'D',
        team_id: '',
      }),
    };
    const service = await buildService(client);

    await expect(service.getChannelOwnerId('dm1')).resolves.toBe('');

    await service.shutdown();
  });

  it('returns empty string when the channel cannot be resolved', async () => {
    const client = { getChannelInfo: jest.fn().mockResolvedValue(null) };
    const service = await buildService(client);

    await expect(service.getChannelOwnerId('missing')).resolves.toBe('');

    await service.shutdown();
  });

  it('returns empty string when the client lookup throws', async () => {
    const client = { getChannelInfo: jest.fn().mockRejectedValue(new Error('network down')) };
    const service = await buildService(client);

    await expect(service.getChannelOwnerId('chan1')).resolves.toBe('');

    await service.shutdown();
  });

  it('returns empty string when no client is configured', async () => {
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();

    await expect(service.getChannelOwnerId('chan1')).resolves.toBe('');

    await service.shutdown();
  });
});
