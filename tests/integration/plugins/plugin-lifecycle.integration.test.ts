import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Plugin Lifecycle Integration', () => {
  const originalEnv = { ...process.env };
  let tempPluginsDir: string;

  beforeEach(() => {
    jest.resetModules();
    tempPluginsDir = path.join(os.tmpdir(), `hivemind-plugins-test-${Date.now()}`);
    fs.mkdirSync(tempPluginsDir, { recursive: true });
    process.env.HIVEMIND_PLUGINS_DIR = tempPluginsDir;

    // Use doMock to ensure it uses the fresh tempPluginsDir
    jest.doMock('../../../src/plugins/PluginLoader', () => {
      const actual = jest.requireActual('../../../src/plugins/PluginLoader');
      return {
        ...actual,
        PLUGINS_DIR: tempPluginsDir,
      };
    });
  });

  afterEach(() => {
    if (tempPluginsDir && fs.existsSync(tempPluginsDir)) {
      try {
        fs.rmSync(tempPluginsDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup
      }
    }
    process.env = originalEnv;
  });

  it('should return an empty list when no plugins are installed', async () => {
    const { listInstalledPlugins } = require('../../../src/plugins/PluginManager');
    const plugins = await listInstalledPlugins();
    expect(plugins).toEqual([]);
  });

  it('should return security policy', async () => {
    const { getSecurityPolicy } = require('../../../src/plugins/PluginManager');
    const policy = await getSecurityPolicy();
    expect(policy).toBeDefined();
    expect(typeof policy.isBuiltIn).toBe('function');
  });

  it('should reflect installed plugins in the registry', async () => {
    const pluginName = 'llm-test';
    // Manually create a dummy plugin directory and registry entry
    const pluginDir = path.join(tempPluginsDir, pluginName);
    fs.mkdirSync(pluginDir, { recursive: true });
    
    const registryFile = path.join(tempPluginsDir, 'registry.json');
    const dummyEntry = {
      name: pluginName,
      repoUrl: 'https://github.com/test/test',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    fs.writeFileSync(registryFile, JSON.stringify([dummyEntry]));
    
    // We also need to mock loadPlugin to return something or at least not fail
    jest.doMock('../../../src/plugins/PluginLoader', () => {
      const actual = jest.requireActual('../../../src/plugins/PluginLoader');
      return {
        ...actual,
        PLUGINS_DIR: tempPluginsDir,
        loadPlugin: jest.fn().mockResolvedValue({ manifest: { name: pluginName, type: 'llm' } }),
      };
    });
    
    const { listInstalledPlugins } = require('../../../src/plugins/PluginManager');
    const plugins = await listInstalledPlugins();
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe(pluginName);
  });
});
