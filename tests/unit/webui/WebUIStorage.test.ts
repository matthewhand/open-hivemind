import fs from 'fs';
import { jest } from '@jest/globals';
import { WebUIStorage } from '../../../src/storage/webUIStorage';

// Mock fs
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
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    storage = new WebUIStorage();
  });

  it('should use cache and read from disk only once', () => {
    // Call loadConfig multiple times
    storage.loadConfig();
    storage.loadConfig();
    storage.loadConfig();

    // Expect readFileSync to be called only once
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('should update cache on saveConfig', () => {
    // Initial load
    const config1 = storage.loadConfig();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);

    // Modify and save
    const newConfig = { ...config1, agents: [{ id: 'new-agent' }] };
    storage.saveConfig(newConfig);

    // Load again
    const config2 = storage.loadConfig();

    // Should verify writeFileSync was called
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

    // Should NOT read from disk again
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);

    // Should return updated config
    expect(config2.agents).toHaveLength(1);
    expect(config2.agents[0].id).toBe('new-agent');
  });
});
