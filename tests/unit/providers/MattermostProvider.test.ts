import fs from 'fs';
import os from 'os';
import path from 'path';
import { MattermostProvider } from '../../../src/providers/MattermostProvider';

/**
 * These tests cover the previously-unimplemented connection path in
 * MattermostProvider.addBot (which used to throw "Method not implemented.").
 * The key guarantee is that addBot wires a real connection via the injected
 * MattermostService without ever throwing synchronously on connection failure,
 * so bot startup and other providers are never broken.
 */
describe('MattermostProvider.addBot', () => {
  let tmpDir: string;
  let prevConfigDir: string | undefined;
  let mockService: any;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-provider-'));
    prevConfigDir = process.env.NODE_CONFIG_DIR;
    process.env.NODE_CONFIG_DIR = tmpDir;

    mockService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getBotNames: jest.fn().mockReturnValue([]),
      getBotConfig: jest.fn().mockReturnValue({}),
      getClientId: jest.fn().mockReturnValue('client-id'),
    };

    // Avoid real network calls from the reconnection health check.
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
  });

  afterEach(() => {
    if (prevConfigDir === undefined) {
      delete process.env.NODE_CONFIG_DIR;
    } else {
      process.env.NODE_CONFIG_DIR = prevConfigDir;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('does not throw and establishes a connection via the service', async () => {
    const provider = new MattermostProvider(mockService);

    await expect(
      provider.addBot({
        name: 'bot1',
        serverUrl: 'https://mm.example.com',
        token: 'secret-token',
        channel: 'town-square',
      })
    ).resolves.toBeUndefined();

    // Let the async ReconnectionManager.start() microtasks settle.
    await new Promise((r) => setImmediate(r));

    // The provider wired a real connection through the existing service.
    expect(mockService.initialize).toHaveBeenCalled();
  });

  it('persists the instance to messengers.json', async () => {
    const provider = new MattermostProvider(mockService);

    await provider.addBot({
      name: 'persisted-bot',
      serverUrl: 'https://mm.example.com',
      token: 'tok',
    });

    const messengersPath = path.join(tmpDir, 'providers', 'messengers.json');
    expect(fs.existsSync(messengersPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(messengersPath, 'utf8'));
    expect(written.mattermost.instances).toEqual([
      expect.objectContaining({
        name: 'persisted-bot',
        serverUrl: 'https://mm.example.com',
        token: 'tok',
        channel: 'town-square',
      }),
    ]);
  });

  it('registers a ReconnectionManager so status reflects the bot', async () => {
    mockService.getBotNames.mockReturnValue(['bot1']);
    mockService.getBotConfig.mockReturnValue({
      serverUrl: 'https://mm.example.com',
      channel: 'town-square',
    });
    const provider = new MattermostProvider(mockService);

    await provider.addBot({
      name: 'bot1',
      serverUrl: 'https://mm.example.com',
      token: 'tok',
    });

    const status = await provider.getStatus();
    expect(status.ok).toBe(true);
    expect((status.bots as any[]).some((b) => b.name === 'bot1')).toBe(true);
  });

  it('throws a validation error when required fields are missing (no connection attempt)', async () => {
    const provider = new MattermostProvider(mockService);

    await expect(provider.addBot({ name: 'incomplete' })).rejects.toThrow(
      'name, serverUrl, and token are required'
    );
    expect(mockService.initialize).not.toHaveBeenCalled();
  });

  it('does not reject even if the underlying connection fails', async () => {
    mockService.initialize = jest.fn().mockRejectedValue(new Error('boom'));
    const provider = new MattermostProvider(mockService);

    // addBot must resolve cleanly even though the connection attempt fails,
    // guaranteeing startup is never crashed by a bad Mattermost server.
    await expect(
      provider.addBot({
        name: 'failing-bot',
        serverUrl: 'https://mm.example.com',
        token: 'tok',
      })
    ).resolves.toBeUndefined();

    await new Promise((r) => setImmediate(r));
    expect(mockService.initialize).toHaveBeenCalled();
  });
});
