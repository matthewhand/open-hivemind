/**
 * Regression test for audit stub (mattermost-model-activity):
 * MattermostService.setModelActivity() used to be a no-op. It now (opt-in via
 * MATTERMOST_ENABLE_STATUS_UPDATES=true) sets the bot's Mattermost custom
 * status to surface the active LLM model, with de-duplication and best-effort
 * error handling.
 */

jest.mock('@src/config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: jest.fn().mockReturnValue([]) }),
  },
}));

describe('MattermostService.setModelActivity', () => {
  const ORIGINAL_ENV = process.env.MATTERMOST_ENABLE_STATUS_UPDATES;

  afterEach(async () => {
    process.env.MATTERMOST_ENABLE_STATUS_UPDATES = ORIGINAL_ENV;
    jest.resetModules();
  });

  /** Builds a service singleton with one injected fake client. */
  const buildService = async () => {
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();
    const setCustomStatus = jest.fn().mockResolvedValue(undefined);
    const fakeClient = { setCustomStatus } as any;
    (service as any).clients.set('bot1', fakeClient);
    (service as any).botConfigs.set('bot1', { name: 'bot1' });
    return { service, setCustomStatus };
  };

  it('no-ops by default (flag disabled) — graceful, no API call', async () => {
    delete process.env.MATTERMOST_ENABLE_STATUS_UPDATES;
    const { service, setCustomStatus } = await buildService();

    await expect(service.setModelActivity('gpt-4o', 'bot1')).resolves.toBeUndefined();
    expect(setCustomStatus).not.toHaveBeenCalled();

    await service.shutdown();
  });

  it('sets the custom status when the flag is enabled', async () => {
    process.env.MATTERMOST_ENABLE_STATUS_UPDATES = 'true';
    const { service, setCustomStatus } = await buildService();

    await service.setModelActivity('gpt-4o', 'bot1');

    expect(setCustomStatus).toHaveBeenCalledTimes(1);
    expect(setCustomStatus).toHaveBeenCalledWith('Model: gpt-4o');

    await service.shutdown();
  });

  it('de-duplicates repeated calls with the same model for a bot', async () => {
    process.env.MATTERMOST_ENABLE_STATUS_UPDATES = 'true';
    const { service, setCustomStatus } = await buildService();

    await service.setModelActivity('gpt-4o', 'bot1');
    await service.setModelActivity('gpt-4o', 'bot1');
    expect(setCustomStatus).toHaveBeenCalledTimes(1);

    // A different model triggers another update.
    await service.setModelActivity('claude-opus', 'bot1');
    expect(setCustomStatus).toHaveBeenCalledTimes(2);
    expect(setCustomStatus).toHaveBeenLastCalledWith('Model: claude-opus');

    await service.shutdown();
  });

  it('falls back to the first bot when no senderKey is given', async () => {
    process.env.MATTERMOST_ENABLE_STATUS_UPDATES = 'true';
    const { service, setCustomStatus } = await buildService();

    await service.setModelActivity('gpt-4o');
    expect(setCustomStatus).toHaveBeenCalledWith('Model: gpt-4o');

    await service.shutdown();
  });

  it('swallows client errors (best-effort)', async () => {
    process.env.MATTERMOST_ENABLE_STATUS_UPDATES = 'true';
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();
    const setCustomStatus = jest.fn().mockRejectedValue(new Error('boom'));
    (service as any).clients.set('bot1', { setCustomStatus } as any);
    (service as any).botConfigs.set('bot1', { name: 'bot1' });

    await expect(service.setModelActivity('gpt-4o', 'bot1')).resolves.toBeUndefined();
    expect(setCustomStatus).toHaveBeenCalledTimes(1);

    await service.shutdown();
  });

  it('no-ops gracefully when no clients are registered', async () => {
    process.env.MATTERMOST_ENABLE_STATUS_UPDATES = 'true';
    const { MattermostService } = await import('./MattermostService');
    const service = MattermostService.getInstance();

    await expect(service.setModelActivity('gpt-4o')).resolves.toBeUndefined();

    await service.shutdown();
  });
});
