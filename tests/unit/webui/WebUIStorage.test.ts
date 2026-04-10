import fs from 'fs';
import { jest } from '@jest/globals';
import { WebUIStorage } from '../../../src/storage/webUIStorage';

describe('WebUIStorage Performance', () => {
  let storage: WebUIStorage;
  const mockConfig = {
    agents: [],
    mcpServers: [],
    llmProviders: [],
    messengerProviders: [],
    personas: [],
    guards: [],
    lastUpdated: '2023-01-01T00:00:00.000Z',
  };

  let existsSyncSpy: jest.SpiedFunction<typeof fs.existsSync>;
  let promisesAccessSpy: jest.SpiedFunction<typeof fs.promises.access>;
  let promisesReadFileSpy: jest.SpiedFunction<typeof fs.promises.readFile>;
  let writeFileSyncSpy: jest.SpiedFunction<typeof fs.writeFileSync>;
  let mkdirSyncSpy: jest.SpiedFunction<typeof fs.mkdirSync>;
  let promisesWriteFileSpy: jest.SpiedFunction<typeof fs.promises.writeFile>;

  beforeEach(() => {
    jest.restoreAllMocks();
    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    promisesAccessSpy = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
    promisesReadFileSpy = jest
      .spyOn(fs.promises, 'readFile')
      .mockResolvedValue(JSON.stringify(mockConfig));
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    promisesWriteFileSpy = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
    mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation((() => undefined) as any);

    storage = new WebUIStorage();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use cache and read from disk only once', async () => {
    // Call loadConfig multiple times
    await storage.loadConfig();
    await storage.loadConfig();
    await storage.loadConfig();

    // Expect readFile to be called only once
    expect(promisesReadFileSpy).toHaveBeenCalledTimes(1);
  });

  it('should update cache on saveConfig', async () => {
    // Initial load
    const config1 = await storage.loadConfig();
    expect(promisesReadFileSpy).toHaveBeenCalledTimes(1);

    // Modify and save
    const newConfig = { ...config1, agents: [{ id: 'new-agent' }] };
    await storage.saveConfig(newConfig);

    // Load again
    const config2 = await storage.loadConfig();

    // Should verify promisesWriteFile was called
    expect(promisesWriteFileSpy).toHaveBeenCalledTimes(1);

    // Should NOT read from disk again
    expect(promisesReadFileSpy).toHaveBeenCalledTimes(1);

    // Should return updated config
    expect(config2.agents).toHaveLength(1);
    expect(config2.agents[0].id).toBe('new-agent');
  });
});
