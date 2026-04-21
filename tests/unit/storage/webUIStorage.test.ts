import fs from 'fs';
import os from 'os';
import path from 'path';
import { WebUIStorage } from '@src/storage/webUIStorage';

describe('WebUIStorage', () => {
  let storage: WebUIStorage;
  let testConfigDir: string;
  let testConfigFile: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    testConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webui-storage-test-'));
    process.chdir(testConfigDir);
    fs.mkdirSync(path.join(testConfigDir, 'config', 'user'), { recursive: true });
    testConfigFile = path.join(testConfigDir, 'config', 'user', 'webui-config.json');
    process.env.DISABLE_ENCRYPTION = 'true';
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    console.error('TEST beforeEach starting');
    storage = new WebUIStorage();
    if (fs.existsSync(testConfigFile)) {
      fs.unlinkSync(testConfigFile);
    }
  });

  describe('loadConfig', () => {
    it('should return default config if file does not exist', async () => {
      const config = await storage.loadConfig();
      expect(config.agents).toEqual([]);
      expect(config.llmProviders).toEqual([]);
    });

    it('should load existing config file', async () => {
      const mockConfig = {
        agents: [{ id: 'test-agent', name: 'Test' }],
        llmProviders: [],
        mcpServers: [],
        messengerProviders: [],
        personas: [],
        guards: [],
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));
      
      const config = await storage.loadConfig();
      expect(config.agents).toHaveLength(1);
      expect(config.agents[0].id).toBe('test-agent');
    });
  });

  describe('saveConfig', () => {
    it('should save config to file', async () => {
      const mockConfig: any = {
        agents: [{ id: 'new-agent' }],
        guards: [],
      };
      await storage.saveConfig(mockConfig);
      
      const savedData = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(savedData.agents).toHaveLength(1);
      expect(savedData.agents[0].id).toBe('new-agent');
    });
  });

  describe('getGuards', () => {
    it('should return default guards if none exist', async () => {
      const guards = await storage.getGuards();
      expect(guards.length).toBeGreaterThanOrEqual(3);
      expect(guards.some(g => g.id === 'access-control')).toBe(true);
    });

    it('should return existing guards', async () => {
      const mockConfig: any = {
        guards: [{ id: 'custom', name: 'Custom', enabled: true, config: {} }],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));
      
      const guards = await storage.getGuards();
      expect(guards.some(g => g.id === 'custom')).toBe(true);
    });
  });

  describe('toggleGuard', () => {
    it('should toggle guard status', async () => {
      const mockConfig: any = {
        guards: [{ id: 'toggle-me', name: 'Toggle', enabled: true, config: {} }],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(mockConfig));
      
      await storage.toggleGuard('toggle-me', false);
      
      const config = await storage.loadConfig();
      const guard = config.guards.find(g => g.id === 'toggle-me');
      expect(guard?.enabled).toBe(false);
    });
  });
});
