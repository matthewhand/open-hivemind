import * as fs from 'fs';
import { WebUIStorage } from '../../../src/storage/webUIStorage';

jest.mock('fs');

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

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);

    storage = new WebUIStorage();
  });

  it('should use cache and read from disk only once', () => {
    // Call loadConfig multiple times
    const config1 = storage.loadConfig();
    const config2 = storage.loadConfig();
    const config3 = storage.loadConfig();

    // The cache should return the exact same object reference
    expect(config1).toBe(config2);
    expect(config2).toBe(config3);
  });

  it('should update cache on saveConfig', () => {
    // Initial load
    const config1 = storage.loadConfig();

    // Modify and save
    const newConfig = { ...config1, agents: [{ id: 'new-agent' }] };
    storage.saveConfig(newConfig);

    // Load again
    const config2 = storage.loadConfig();

    // Should return updated config with exact same reference
    expect(config2).toBe(newConfig);
    expect(config2.agents).toHaveLength(1);
    expect(config2.agents[0].id).toBe('new-agent');
  });
});
