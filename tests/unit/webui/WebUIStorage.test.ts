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
  let readFileSyncSpy: jest.SpiedFunction<typeof fs.readFileSync>;
  let writeFileSyncSpy: jest.SpiedFunction<typeof fs.writeFileSync>;
  let mkdirSyncSpy: jest.SpiedFunction<typeof fs.mkdirSync>;

  beforeEach(() => {
    jest.restoreAllMocks();
    existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation((() => undefined) as any);

    storage = new WebUIStorage();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use cache and read from disk only once', () => {
    // Call loadConfig multiple times
    storage.loadConfig();
    storage.loadConfig();
    storage.loadConfig();

    // Expect readFileSync to be called only once
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
  });

  it('should update cache on saveConfig', () => {
    // Initial load
    const config1 = storage.loadConfig();
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);

    // Modify and save
    const newConfig = { ...config1, agents: [{ id: 'new-agent' }] };
    storage.saveConfig(newConfig);

    // Load again
    const config2 = storage.loadConfig();

    // Should verify writeFileSync was called
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);

    // Should NOT read from disk again
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);

    // Should return updated config
    expect(config2.agents).toHaveLength(1);
    expect(config2.agents[0].id).toBe('new-agent');
  });
});
