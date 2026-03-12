import fs from 'fs';
import { WebUIStorage } from '../../../src/storage/webUIStorage';

describe('WebUIStorage Performance', () => {
  const mockConfig = {
    agents: [],
    mcpServers: [],
    llmProviders: [],
    messengerProviders: [],
    personas: [],
    guards: [],
    lastUpdated: '2023-01-01T00:00:00.000Z',
  };

  let storage: WebUIStorage;

  const resetMocks = () => {
    (fs.existsSync as jest.Mock).mockClear();
    (fs.readFileSync as jest.Mock).mockClear();
    (fs.writeFileSync as jest.Mock).mockClear();
    (fs.mkdirSync as jest.Mock).mockClear();
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

    storage = new WebUIStorage();
    storage.resetCache();

    resetMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should use cache and read from disk only once', () => {
    storage.loadConfig();
    storage.loadConfig();
    storage.loadConfig();

    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('should update cache on saveConfig', () => {
    const config1 = storage.loadConfig();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);

    const newConfig = { ...config1, agents: [{ id: 'new-agent' }] };
    storage.saveConfig(newConfig);

    const config2 = storage.loadConfig();

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(config2.agents).toHaveLength(1);
    expect(config2.agents[0].id).toBe('new-agent');
  });
});
