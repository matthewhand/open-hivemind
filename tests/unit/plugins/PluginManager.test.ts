import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { loadPlugin, PLUGINS_DIR } from '@src/plugins/PluginLoader';
import {
  installPlugin,
  listInstalledPlugins,
  PluginValidationError,
  uninstallPlugin,
  updatePlugin,
} from '@src/plugins/PluginManager';

// Mock fs — create mocks inside the factory to avoid hoisting issues
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      access: jest.fn(),
      mkdir: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
      rename: jest.fn(),
      rm: jest.fn(),
      readdir: jest.fn(),
    },
  };
});

// Grab references to the mocked fs.promises methods
const mockAccess = fs.promises.access as jest.Mock;
const mockMkdir = fs.promises.mkdir as jest.Mock;
const mockWriteFile = fs.promises.writeFile as jest.Mock;
const mockReadFile = fs.promises.readFile as jest.Mock;
const mockRename = fs.promises.rename as jest.Mock;
const mockRm = fs.promises.rm as jest.Mock;
const mockReaddir = fs.promises.readdir as jest.Mock;

// Mock child_process so tests don't run git
jest.mock('child_process');

const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

// Mock PluginLoader so we control what modules are "loaded"
jest.mock('@src/plugins/PluginLoader', () => ({
  PLUGINS_DIR: '/mock/plugins',
  loadPlugin: jest.fn(),
}));

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

/** Helper: make mockAccess reject with ENOENT for a path */
function accessNotFound() {
  const err: any = new Error('ENOENT');
  err.code = 'ENOENT';
  return Promise.reject(err);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockExecFileSync.mockReturnValue(Buffer.from(''));
  mockLoadPlugin.mockReturnValue(validModule);

  // Default fs.promises mocks
  mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
  mockMkdir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
  mockRename.mockResolvedValue(undefined);
  mockRm.mockResolvedValue(undefined);
  mockReaddir.mockResolvedValue([]);

  // Return registry JSON for registry.json, package.json content for everything else
  mockReadFile.mockImplementation((filePath: string) => {
    if (String(filePath).endsWith('registry.json')) return Promise.resolve(JSON.stringify([]));
    return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' }));
  });
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

    await expect(installPlugin('https://github.com/user/llm-myprovider')).rejects.toThrow(
      PluginValidationError
    );

    await expect(installPlugin('https://github.com/user/llm-myprovider')).rejects.toThrow(
      /Manifest type mismatch/
    );
  });

  it('rejects when package name has invalid type prefix', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ name: 'unknown-myprovider', version: '1.0.0' })
    );

    await expect(installPlugin('https://github.com/user/unknown-myprovider')).rejects.toThrow(
      PluginValidationError
    );
  });

  it('rejects when manifest is missing entirely', async () => {
    mockLoadPlugin.mockReturnValue({ create: jest.fn() }); // no manifest

    await expect(installPlugin('https://github.com/user/llm-myprovider')).rejects.toThrow(
      PluginValidationError
    );

    await expect(installPlugin('https://github.com/user/llm-myprovider')).rejects.toThrow(
      /does not export a 'manifest'/
    );
  });

  it('accepts when manifest.type matches name prefix', async () => {
    // access rejects with ENOENT for pluginPath (not already installed)
    // Default mockAccess already rejects with ENOENT

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
    // pluginPath does not exist (ENOENT) — default mock handles this

    await installPlugin('https://github.com/user/llm-myprovider');

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'git',
      [
        'clone',
        '--depth',
        '1',
        'https://github.com/user/llm-myprovider',
        expect.stringContaining('_install_'),
      ],
      expect.any(Object)
    );
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'pnpm',
      ['install', '--prod', '--ignore-scripts'],
      expect.any(Object)
    );
  });

  it('throws if plugin is already installed', async () => {
    // pluginPath exists (access resolves)
    mockAccess.mockResolvedValue(undefined);

    await expect(installPlugin('https://github.com/user/llm-myprovider')).rejects.toThrow(
      /already installed/
    );
  });

  it('cleans up temp dir on failure', async () => {
    // access resolves for tempPath (cleanup check), rejects for pluginPath
    mockAccess.mockImplementation((p: string) => {
      if (String(p).includes('_install_')) return Promise.resolve(undefined);
      return accessNotFound();
    });
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error('git failed');
    });

    await expect(installPlugin('https://github.com/user/llm-myprovider')).rejects.toThrow(
      'git failed'
    );

    expect(mockRm).toHaveBeenCalledWith(expect.stringContaining('_install_'), {
      recursive: true,
      force: true,
    });
  });
});

// ---------------------------------------------------------------------------
// uninstallPlugin
// ---------------------------------------------------------------------------

describe('uninstallPlugin', () => {
  it('removes plugin directory and registry entry', async () => {
    // pluginPath exists
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith('registry.json')) {
        return Promise.resolve(
          JSON.stringify([
            {
              name: 'llm-myprovider',
              repoUrl: 'https://...',
              installedAt: '',
              updatedAt: '',
              version: '1.0.0',
            },
          ])
        );
      }
      return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' }));
    });

    await uninstallPlugin('llm-myprovider');

    expect(mockRm).toHaveBeenCalledWith(path.join(PLUGINS_DIR, 'llm-myprovider'), {
      recursive: true,
      force: true,
    });
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('registry.json'),
      expect.not.stringContaining('llm-myprovider')
    );
  });

  it('throws if plugin directory not found', async () => {
    // pluginPath does not exist — default mock handles ENOENT

    await expect(uninstallPlugin('llm-notexist')).rejects.toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// updatePlugin
// ---------------------------------------------------------------------------

describe('updatePlugin', () => {
  it('runs git pull and pnpm install then re-validates manifest', async () => {
    // pluginPath exists
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith('registry.json')) {
        return Promise.resolve(
          JSON.stringify([
            {
              name: 'llm-myprovider',
              repoUrl: 'https://github.com/user/llm-myprovider',
              installedAt: '2026-01-01',
              updatedAt: '2026-01-01',
              version: '1.0.0',
            },
          ])
        );
      }
      return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' }));
    });

    const result = await updatePlugin('llm-myprovider');

    expect(mockExecFileSync).toHaveBeenCalledWith('git', ['pull', '--ff-only'], expect.any(Object));
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'pnpm',
      ['install', '--prod', '--ignore-scripts'],
      expect.any(Object)
    );
    expect(result.name).toBe('llm-myprovider');
  });

  it('throws if manifest type changes to mismatch after update', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue(JSON.stringify([]));
    mockLoadPlugin.mockReturnValue({
      manifest: { ...validManifest, type: 'memory' }, // now mismatches 'llm-' prefix
    });

    await expect(updatePlugin('llm-myprovider')).rejects.toThrow(PluginValidationError);
  });

  it('throws if plugin not installed', async () => {
    // Default mockAccess rejects with ENOENT
    await expect(updatePlugin('llm-notexist')).rejects.toThrow(/not found/);
  });
});

// ---------------------------------------------------------------------------
// listInstalledPlugins
// ---------------------------------------------------------------------------

describe('listInstalledPlugins', () => {
  it('returns empty array when plugins dir does not exist', async () => {
    // Default mockAccess rejects with ENOENT
    const results = await listInstalledPlugins();
    expect(results).toEqual([]);
  });

  it('lists plugins from directory scan', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([
      { name: 'llm-myprovider', isDirectory: () => true },
    ] as any);
    mockReadFile.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith('registry.json')) return Promise.resolve(JSON.stringify([]));
      return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' }));
    });

    const results = await listInstalledPlugins();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('llm-myprovider');
    expect(results[0].manifest).toEqual(validManifest);
  });

  it('skips directories without a valid manifest', async () => {
    mockAccess.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([
      { name: 'broken-plugin', isDirectory: () => true },
    ] as any);
    mockReadFile.mockResolvedValue(JSON.stringify([]));
    mockLoadPlugin.mockReturnValue({}); // no manifest

    const results = await listInstalledPlugins();
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// URL security validation
// ---------------------------------------------------------------------------

describe('URL security validation', () => {
  it('rejects URLs with argument injection patterns in hostname', async () => {
    await expect(installPlugin('https:// --upload-pack=malicious.com/repo')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('https:// --config=evil.com/repo')).rejects.toThrow(PluginValidationError);
  });

  it('rejects URLs with shell metacharacters in hostname', async () => {
    await expect(installPlugin('https://host;name.com/repo')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('https://host|name.com/repo')).rejects.toThrow(PluginValidationError);
    await expect(installPlugin('https://host`name.com/repo')).rejects.toThrow(PluginValidationError);
  });

  it('rejects URLs with spaces in hostname', async () => {
    // Note: spaces in the path are percent-encoded by the URL constructor,
    // so only spaces in the hostname are detected by the source validation.
    await expect(installPlugin('https://host name.com/repo')).rejects.toThrow(PluginValidationError);
  });
});
