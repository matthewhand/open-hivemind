import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

// Mock fs and child_process so tests don't touch the real filesystem or run git
jest.mock('fs');
jest.mock('child_process');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

// Mock PluginLoader so we control what modules are "loaded"
jest.mock('@src/plugins/PluginLoader', () => ({
  PLUGINS_DIR: '/mock/plugins',
  loadPlugin: jest.fn(),
}));

import { loadPlugin, PLUGINS_DIR } from '@src/plugins/PluginLoader';
import {
  installPlugin,
  uninstallPlugin,
  updatePlugin,
  listInstalledPlugins,
  PluginValidationError,
} from '@src/plugins/PluginManager';

const mockLoadPlugin = loadPlugin as jest.MockedFunction<typeof loadPlugin>;

const validManifest = {
  displayName: 'My LLM',
  description: 'A test LLM provider',
  type: 'llm' as const,
};

const validModule = {
  manifest: validManifest,
  create: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockExecFileSync.mockReturnValue(Buffer.from(''));
  mockLoadPlugin.mockReturnValue(validModule);

  // Default fs mocks
  (mockFs.existsSync as jest.Mock).mockReturnValue(false);
  (mockFs.mkdirSync as jest.Mock).mockReturnValue(undefined);
  (mockFs.renameSync as jest.Mock).mockReturnValue(undefined);
  (mockFs.rmSync as jest.Mock).mockReturnValue(undefined);
  (mockFs.writeFileSync as jest.Mock).mockReturnValue(undefined);
  // Return registry JSON for registry.json, package.json content for everything else
  (mockFs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
    if (String(filePath).endsWith('registry.json')) return JSON.stringify([]);
    return JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' });
  });
  (mockFs.readdirSync as jest.Mock).mockReturnValue([]);
});

// ---------------------------------------------------------------------------
// validateManifestType — tested via installPlugin
// ---------------------------------------------------------------------------

describe('manifest type validation', () => {
  it('rejects when manifest.type does not match name prefix', async () => {
    mockLoadPlugin.mockReturnValue({
      manifest: { ...validManifest, type: 'memory' }, // name prefix is 'llm', manifest says 'memory'
      create: jest.fn(),
    });

    await expect(
      installPlugin('https://github.com/user/llm-myprovider')
    ).rejects.toThrow(PluginValidationError);

    await expect(
      installPlugin('https://github.com/user/llm-myprovider')
    ).rejects.toThrow(/Manifest type mismatch/);
  });

  it('rejects when package name has invalid type prefix', async () => {
    (mockFs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({ name: 'unknown-myprovider', version: '1.0.0' })
    );

    await expect(
      installPlugin('https://github.com/user/unknown-myprovider')
    ).rejects.toThrow(PluginValidationError);
  });

  it('rejects when manifest is missing entirely', async () => {
    mockLoadPlugin.mockReturnValue({ create: jest.fn() }); // no manifest

    await expect(
      installPlugin('https://github.com/user/llm-myprovider')
    ).rejects.toThrow(PluginValidationError);

    await expect(
      installPlugin('https://github.com/user/llm-myprovider')
    ).rejects.toThrow(/does not export a 'manifest'/);
  });

  it('accepts when manifest.type matches name prefix', async () => {
    // existsSync: false for pluginPath (not already installed), true for tempPath
    (mockFs.existsSync as jest.Mock)
      .mockReturnValueOnce(false) // REGISTRY_FILE check in readRegistry
      .mockReturnValueOnce(false); // pluginPath existence check

    const result = await installPlugin('https://github.com/user/llm-myprovider');
    expect(result.manifest.type).toBe('llm');
    expect(result.name).toBe('llm-myprovider');
  });
});

// ---------------------------------------------------------------------------
// installPlugin
// ---------------------------------------------------------------------------

describe('installPlugin', () => {
  it('rejects URLs starting with a dash', async () => {
    await expect(installPlugin('-u')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('-u')).rejects.toThrow(/cannot start with a dash/);
  });

  it('rejects URLs with invalid protocols', async () => {
    await expect(installPlugin('file:///etc/passwd')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('file:///etc/passwd')).rejects.toThrow(
      /Only http: and https: are allowed/
    );
  });

  it('clones repo and installs dependencies', async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);

    await installPlugin('https://github.com/user/llm-myprovider');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git', ['clone', '--depth', '1', 'https://github.com/user/llm-myprovider', expect.stringContaining('_install_')],
      expect.any(Object)
    );
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'pnpm', ['install', '--prod', '--ignore-scripts'],
      expect.any(Object)
    );
  });

  it('throws if plugin is already installed', async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValueOnce(true); // pluginPath already exists

    await expect(
      installPlugin('https://github.com/user/llm-myprovider')
    ).rejects.toThrow(/already installed/);
  });

  it('cleans up temp dir on failure', async () => {
    // tempPath exists after failed clone attempt, pluginPath does not
    (mockFs.existsSync as jest.Mock).mockImplementation((p: string) =>
      String(p).includes('_install_')
    );
    mockExecFileSync.mockImplementationOnce(() => { throw new Error('git failed'); });

    await expect(
      installPlugin('https://github.com/user/llm-myprovider')
    ).rejects.toThrow('git failed');

    expect(mockFs.rmSync).toHaveBeenCalledWith(
      expect.stringContaining('_install_'),
      { recursive: true, force: true }
    );
  });
});

// ---------------------------------------------------------------------------
// uninstallPlugin
// ---------------------------------------------------------------------------

describe('uninstallPlugin', () => {
  it('removes plugin directory and registry entry', async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify([{ name: 'llm-myprovider', repoUrl: 'https://...', installedAt: '', updatedAt: '', version: '1.0.0' }])
    );

    await uninstallPlugin('llm-myprovider');

    expect(mockFs.rmSync).toHaveBeenCalledWith(
      path.join(PLUGINS_DIR, 'llm-myprovider'),
      { recursive: true, force: true }
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('registry.json'),
      expect.not.stringContaining('llm-myprovider')
    );
  });

  it('throws if plugin directory not found', async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);

    await expect(uninstallPlugin('llm-notexist')).rejects.toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// updatePlugin
// ---------------------------------------------------------------------------

describe('updatePlugin', () => {
  it('runs git pull and pnpm install then re-validates manifest', async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify([{ name: 'llm-myprovider', repoUrl: 'https://github.com/user/llm-myprovider', installedAt: '2026-01-01', updatedAt: '2026-01-01', version: '1.0.0' }])
    );

    const result = await updatePlugin('llm-myprovider');

    expect(mockExecFileSync).toHaveBeenCalledWith('git', ['pull', '--ff-only'], expect.any(Object));
    expect(mockExecFileSync).toHaveBeenCalledWith('pnpm', ['install', '--prod', '--ignore-scripts'], expect.any(Object));
    expect(result.name).toBe('llm-myprovider');
  });

  it('throws if manifest type changes to mismatch after update', async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([]));
    mockLoadPlugin.mockReturnValue({
      manifest: { ...validManifest, type: 'memory' }, // now mismatches 'llm-' prefix
    });

    await expect(updatePlugin('llm-myprovider')).rejects.toThrow(PluginValidationError);
  });

  it('throws if plugin not installed', async () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
    await expect(updatePlugin('llm-notexist')).rejects.toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// listInstalledPlugins
// ---------------------------------------------------------------------------

describe('listInstalledPlugins', () => {
  it('returns empty array when plugins dir does not exist', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
    expect(listInstalledPlugins()).toEqual([]);
  });

  it('lists plugins from directory scan', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readdirSync as jest.Mock).mockReturnValue([
      { name: 'llm-myprovider', isDirectory: () => true },
    ] as any);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([])); // empty registry

    const results = listInstalledPlugins();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('llm-myprovider');
    expect(results[0].manifest).toEqual(validManifest);
  });

  it('skips directories without a valid manifest', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readdirSync as jest.Mock).mockReturnValue([
      { name: 'broken-plugin', isDirectory: () => true },
    ] as any);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([]));
    mockLoadPlugin.mockReturnValue({}); // no manifest

    expect(listInstalledPlugins()).toEqual([]);
  });
});

  // Additional security tests for argument injection prevention
  it('rejects URLs with argument injection patterns in hostname', async () => {
    await expect(installPlugin('https:// --upload-pack=malicious.com/repo')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('https:// --config=evil.com/repo')).rejects.toThrow(PluginValidationError);
  });

  it('rejects URLs with shell metacharacters in hostname', async () => {
    await expect(installPlugin('https://host;name.com/repo')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('https://host|name.com/repo')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('https://host`name.com/repo')).rejects.toThrow(PluginValidationError);
  });

  it('rejects URLs with spaces in hostname or path', async () => {
    await expect(installPlugin('https://host name.com/repo')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('https://hostname.com/path with spaces')).rejects.toThrow(PluginValidationError);
  });
