import fs from 'fs';
import path from 'path';
import { WebUIStorage, webUIStorage } from '../../../src/storage/webUIStorage';

// We can bypass jest.mock('fs') and just spy on fs directly
// This is much safer and more reliable
jest.spyOn(fs, 'existsSync');
jest.spyOn(fs, 'readFileSync');
jest.spyOn(fs, 'writeFileSync');
jest.spyOn(fs, 'mkdirSync');

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

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    webUIStorage.clearCacheForTesting();
  });

  it('should use cache and read from disk only once', () => {
    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();

    testStorage.loadConfig();
    testStorage.loadConfig();
    testStorage.loadConfig();

    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('should update cache on saveConfig', () => {
    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();

    const config1 = testStorage.loadConfig();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);

    const newConfig = { ...config1, agents: [{ id: 'new-agent', name: 'New Agent' }] } as any;
    testStorage.saveConfig(newConfig);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

    const config2 = testStorage.loadConfig();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(config2.agents).toHaveLength(1);
    expect(config2.agents[0].id).toBe('new-agent');
  });
});

describe('WebUIStorage Edge Cases', () => {
  const mockConfigEdge = {
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
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfigEdge));
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

    webUIStorage.clearCacheForTesting();
  });

  it('handles empty inputs and missing arrays safely', () => {
    // The loadConfig actually parses JSON so missing fields will be safely caught
    // by default empty array initializations internally or return empty lists in getters
    (fs.readFileSync as jest.Mock).mockReturnValue('{}');

    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();

    const config = testStorage.loadConfig();
    // The parsed json has no 'agents', so in loadConfig parsed.agents is undefined.
    // And configCache gets it as undefined.
    expect(config.agents).toBeUndefined();

    // Getting arrays checks safely
    expect(testStorage.getLlmProviders()).toEqual([]);
    expect(testStorage.getMessengerProviders()).toEqual([]);

    // Also getPersonas, getMcps, getAgents return what is set in cache directly, which is undefined here
    expect(testStorage.getAgents()).toBeUndefined();
    expect(testStorage.getMcps()).toBeUndefined();
    expect(testStorage.getPersonas()).toBeUndefined();

    const fullConfig = {
      agents: [], mcpServers: [], personas: [], llmProviders: [], messengerProviders: [], guards: []
    };
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fullConfig));
    testStorage.clearCacheForTesting();
    testStorage.loadConfig();

    const mockConfigNoGuards = { ...fullConfig };
    delete (mockConfigNoGuards as any).guards;
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfigNoGuards));
    const testStorageNoGuards = new WebUIStorage();
    testStorageNoGuards.clearCacheForTesting();
    testStorageNoGuards.loadConfig();
    expect(() => testStorageNoGuards.toggleGuard('test', true)).not.toThrow();

    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fullConfig));
    testStorage.clearCacheForTesting();
    testStorage.loadConfig();

    testStorage.saveLlmProvider({ id: 'llm1' });
    expect(testStorage.getLlmProviders()).toHaveLength(1);

    testStorage.saveMessengerProvider({ id: 'msg1' });
    expect(testStorage.getMessengerProviders()).toHaveLength(1);

    testStorage.saveAgent({ id: 'agent1' });
    testStorage.saveMcp({ name: 'mcp1' });
    testStorage.savePersona({ key: 'p1' });

    expect(testStorage.getAgents()).toHaveLength(1);
    expect(testStorage.getMcps()).toHaveLength(1);
    expect(testStorage.getPersonas()).toHaveLength(1);

    testStorage.deleteAgent('agent1');
    testStorage.deleteMcp('mcp1');
    testStorage.deletePersona('p1');

    expect(testStorage.getAgents()).toHaveLength(0);
    expect(testStorage.getMcps()).toHaveLength(0);
    expect(testStorage.getPersonas()).toHaveLength(0);
  });

  it('handles missing config file during loadConfig gracefully', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p && p.endsWith('webui-config.json')) return false;
        return true;
    });

    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();
    const config = testStorage.loadConfig();

    // When file missing, loadConfig provides fallback default config where all arrays are initialized empty
    expect(config.agents).toEqual([]);
    expect(config.guards).toEqual([]);
  });

  it('handles null/undefined gracefully on explicit saves', () => {
    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();
    const config = testStorage.loadConfig();
    (config as any).llmProviders = undefined;
    (config as any).messengerProviders = undefined;
    (config as any).guards = undefined;
    testStorage.saveConfig(config);

    expect(() => testStorage.saveLlmProvider({ id: 'llm1' })).not.toThrow();
    expect(() => testStorage.saveMessengerProvider({ id: 'msg1' })).not.toThrow();
    expect(() => testStorage.saveGuard({ id: 'g1' })).not.toThrow();
  });

  it('handles file read errors and falls back to default config', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
    });

    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();
    const config = testStorage.loadConfig();
    // Same as missing file - falls back to default empty array config
    expect(config.agents).toEqual([]);

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('handles saveConfig errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Write error');
    });

    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();

    expect(() => {
      testStorage.saveConfig(mockConfigEdge as any);
    }).toThrow('Failed to save web UI configuration: Write error');

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('deletes undefined providers safely without throwing', () => {
    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();
    const config = testStorage.loadConfig();
    (config as any).llmProviders = undefined;
    (config as any).messengerProviders = undefined;
    (config as any).guards = undefined;
    testStorage.saveConfig(config);

    expect(() => testStorage.deleteLlmProvider('test')).not.toThrow();
    expect(() => testStorage.deleteMessengerProvider('test')).not.toThrow();
    expect(() => testStorage.toggleGuard('test', true)).not.toThrow();
  });

  it('creates config directory if it does not exist', () => {
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p && p.endsWith('user')) return false;
        return true;
    });

    const newStorage = new WebUIStorage();

    // ensureConfigDir is called in the constructor, so mkdirSync should be called
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  it('handles config directory creation errors', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fs.existsSync as jest.Mock).mockImplementation((p: string) => {
        if (p && p.endsWith('user')) return false;
        return true;
    });
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {
      throw new Error('Permission denied');
    });

    // WebUIStorage constructor does not try-catch its ensureConfigDir
    // So it throws directly!
    expect(() => {
      new WebUIStorage();
    }).toThrow('Permission denied');
    consoleErrorSpy.mockRestore();
  });

  it('handles concurrent calls to getGuards by returning quickly after flag resets', () => {
    const testStorage = new WebUIStorage();
    testStorage.clearCacheForTesting();

    // Simulate initialization starting
    (testStorage as any).guardsInitializationInProgress = true;

    let calls = 0;
    jest.spyOn(testStorage, 'loadConfig').mockImplementation(() => {
      if (calls++ === 0) {
        (testStorage as any).guardsInitializationInProgress = false;
        return { guards: [{ id: 'test-guard' }] } as any;
      }
      return { guards: [] } as any;
    });

    const guards = testStorage.getGuards();
    expect(guards).toHaveLength(1);

    jest.restoreAllMocks();
  });
});
