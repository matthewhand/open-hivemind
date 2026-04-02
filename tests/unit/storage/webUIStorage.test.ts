import fs from 'fs';
import path from 'path';
import os from 'os';
import { WebUIStorage } from '../../../src/storage/webUIStorage';

describe('WebUIStorage', () => {
  let storage: WebUIStorage;
  let testConfigDir: string;
  let testConfigFile: string;
  let originalCwd: string;

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd();

    // Create a temporary directory for testing
    testConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webui-storage-test-'));
    
    // Change to temp directory for test
    process.chdir(testConfigDir);
    
    // Create config/user directory structure
    fs.mkdirSync(path.join(testConfigDir, 'config', 'user'), { recursive: true });
    testConfigFile = path.join(testConfigDir, 'config', 'user', 'webui-config.json');

    storage = new WebUIStorage();
  });

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd);
    
    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('constructor and initialization', () => {
    it('should create config directory structure', () => {
      const configUserDir = path.join(testConfigDir, 'config', 'user');
      expect(fs.existsSync(configUserDir)).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should load existing config file', () => {
      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));

      const config = storage.loadConfig();

      expect(config).toEqual(mockConfig);
    });

    it('should return default config if file does not exist', () => {
      // Ensure file doesn't exist
      if (fs.existsSync(testConfigFile)) {
        fs.unlinkSync(testConfigFile);
      }

      // Clear cache
      storage = new WebUIStorage();

      const config = storage.loadConfig();

      expect(config).toMatchObject({
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
      });
      expect(config.lastUpdated).toBeDefined();
    });

    it('should return default config if file is corrupted', () => {
      fs.writeFileSync(testConfigFile, 'invalid json');

      // Clear cache
      storage = new WebUIStorage();

      const config = storage.loadConfig();

      expect(config).toMatchObject({
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
      });
    });

    it('should use cached config on subsequent calls', () => {
      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));

      // First call should read from file
      const config1 = storage.loadConfig();

      // Modify file
      fs.writeFileSync(testConfigFile, JSON.stringify({ ...mockConfig, agents: [{ id: 'new' }] }));

      // Second call should use cache (same as first)
      const config2 = storage.loadConfig();

      expect(config1).toEqual(config2);
      expect(config2.agents).toHaveLength(0); // Should be cached version, not modified
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', () => {
      const mockConfig = {
        agents: [{ id: 'test-agent' }],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      storage.saveConfig(mockConfig);

      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(savedData.agents).toHaveLength(1);
      expect(savedData.agents[0].id).toBe('test-agent');
    });

    it('should update lastUpdated timestamp', () => {
      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      const beforeSave = new Date().getTime();
      storage.saveConfig(mockConfig);
      const afterSave = new Date().getTime();

      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      const savedTimestamp = new Date(savedData.lastUpdated).getTime();

      expect(savedTimestamp).toBeGreaterThanOrEqual(beforeSave);
      expect(savedTimestamp).toBeLessThanOrEqual(afterSave);
    });

    it('should throw error if write fails', () => {
      // Make directory read-only to cause write failure
      const configUserDir = path.join(testConfigDir, 'config', 'user');
      fs.chmodSync(configUserDir, 0o444);

      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [],
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      expect(() => storage.saveConfig(mockConfig)).toThrow('Failed to save web UI configuration');

      // Restore permissions for cleanup
      fs.chmodSync(configUserDir, 0o755);
    });
  });

  describe('getGuards - race condition fix', () => {
    it('should initialize default guards if none exist', async () => {
      const guards = await storage.getGuards();

      expect(guards).toHaveLength(3);
      expect(guards[0]).toMatchObject({
        id: 'access-control',
        name: 'Access Control',
        enabled: true,
      });
      expect(guards[1]).toMatchObject({
        id: 'rate-limiter',
        name: 'Rate Limiter',
        enabled: true,
      });
      expect(guards[2]).toMatchObject({
        id: 'content-filter',
        name: 'Content Filter',
        enabled: false,
      });
    });

    it('should return existing guards if they exist', async () => {
      const mockGuards = [
        { id: 'custom-guard', name: 'Custom Guard', enabled: true, config: {}, type: 'custom', description: 'Test' },
      ];

      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: mockGuards,
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));

      // Clear cache
      storage = new WebUIStorage();

      const guards = await storage.getGuards();

      expect(guards).toHaveLength(4); // 1 existing + 3 defaults
      expect(guards[0].id).toBe('custom-guard');
    });

    it('should handle concurrent calls without race conditions', async () => {
      // Clear any existing config
      if (fs.existsSync(testConfigFile)) {
        fs.unlinkSync(testConfigFile);
      }
      storage = new WebUIStorage();

      // Make 10 concurrent calls to getGuards
      const promises = Array.from({ length: 10 }, () => storage.getGuards());
      const results = await Promise.all(promises);

      // All results should be identical
      results.forEach((guards) => {
        expect(guards).toHaveLength(3);
        expect(guards[0].id).toBe('access-control');
      });

      // Read the file - should only be written once
      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(savedData.guards).toHaveLength(3);
    });

    it('should merge default guards with existing guards', async () => {
      const mockGuards = [
        { id: 'access-control', name: 'Custom Access Control', enabled: false, config: {}, type: 'access', description: 'Custom' },
      ];

      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: mockGuards,
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));
      storage = new WebUIStorage();

      const guards = await storage.getGuards();

      expect(guards).toHaveLength(3);
      // Should keep existing access-control guard and add missing defaults
      expect(guards[0].name).toBe('Custom Access Control');
      expect(guards.some((g: any) => g.id === 'rate-limiter')).toBe(true);
      expect(guards.some((g: any) => g.id === 'content-filter')).toBe(true);
    });
  });

  describe('saveGuard', () => {
    it('should save a new guard', () => {
      const newGuard = {
        id: 'new-guard',
        name: 'New Guard',
        enabled: true,
        config: {},
      };

      storage.saveGuard(newGuard);

      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(savedData.guards).toContainEqual(newGuard);
    });

    it('should update an existing guard', () => {
      const existingGuard = {
        id: 'access-control',
        name: 'Access Control',
        enabled: true,
        config: { type: 'users', users: [], ips: [] },
      };

      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [existingGuard],
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));
      storage = new WebUIStorage();

      const updatedGuard = {
        id: 'access-control',
        name: 'Updated Access Control',
        enabled: false,
        config: { type: 'ips', users: [], ips: ['192.168.1.1'] },
      };

      storage.saveGuard(updatedGuard);

      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      const savedGuard = savedData.guards.find((g: any) => g.id === 'access-control');
      expect(savedGuard.name).toBe('Updated Access Control');
      expect(savedGuard.enabled).toBe(false);
    });
  });

  describe('toggleGuard', () => {
    it('should toggle guard enabled status', () => {
      const mockGuard = {
        id: 'access-control',
        name: 'Access Control',
        enabled: true,
        config: {},
      };

      const mockConfig = {
        agents: [],
        mcpServers: [],
        llmProviders: [],
        messengerProviders: [],
        personas: [],
        guards: [mockGuard],
        lastUpdated: '2026-03-30T00:00:00.000Z',
      };

      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));
      storage = new WebUIStorage();

      storage.toggleGuard('access-control', false);

      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      const toggledGuard = savedData.guards.find((g: any) => g.id === 'access-control');
      expect(toggledGuard.enabled).toBe(false);
    });

    it('should handle non-existent guard gracefully', () => {
      expect(() => {
        storage.toggleGuard('non-existent', true);
      }).not.toThrow();
    });
  });

  describe('concurrent access stress test', () => {
    it('should handle 100 concurrent getGuards calls correctly', async () => {
      // Clear any existing config
      if (fs.existsSync(testConfigFile)) {
        fs.unlinkSync(testConfigFile);
      }
      storage = new WebUIStorage();

      // Create 100 concurrent calls
      const promises = Array.from({ length: 100 }, () => storage.getGuards());
      const results = await Promise.all(promises);

      // All results should be consistent
      results.forEach((guards) => {
        expect(guards).toHaveLength(3);
        expect(guards.map((g: any) => g.id).sort()).toEqual([
          'access-control',
          'content-filter',
          'rate-limiter',
        ]);
      });

      // Verify config file was written correctly
      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(savedData.guards).toHaveLength(3);
    }, 10000); // Longer timeout for stress test

    it('should handle mixed concurrent operations', async () => {
      if (fs.existsSync(testConfigFile)) {
        fs.unlinkSync(testConfigFile);
      }
      storage = new WebUIStorage();

      const operations = [
        ...Array.from({ length: 10 }, () => storage.getGuards()),
        ...Array.from({ length: 5 }, () =>
          Promise.resolve().then(() =>
            storage.saveGuard({
              id: 'test-guard',
              name: 'Test',
              enabled: true,
              config: {},
            }),
          ),
        ),
        ...Array.from({ length: 5 }, () =>
          Promise.resolve().then(() => storage.toggleGuard('access-control', false)),
        ),
      ];

      await expect(Promise.all(operations)).resolves.toBeDefined();
    }, 10000);
  });
});
