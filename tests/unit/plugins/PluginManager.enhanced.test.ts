import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { loadPlugin, PLUGINS_DIR } from '@src/plugins/PluginLoader';
import {
  getPluginSecurityStatus,
  getSecurityPolicy,
  installPlugin,
  listInstalledPlugins,
  PluginValidationError,
  setSecurityPolicy,
  uninstallPlugin,
  updatePlugin,
} from '@src/plugins/PluginManager';
import { PluginSecurityPolicy } from '@src/plugins/PluginSecurity';

// Mock fs
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

const mockAccess = fs.promises.access as jest.Mock;
const mockMkdir = fs.promises.mkdir as jest.Mock;
const mockWriteFile = fs.promises.writeFile as jest.Mock;
const mockReadFile = fs.promises.readFile as jest.Mock;
const mockRename = fs.promises.rename as jest.Mock;
const mockRm = fs.promises.rm as jest.Mock;
const mockReaddir = fs.promises.readdir as jest.Mock;

// Mock child_process
jest.mock('child_process');
const mockExecFileSync = execFileSync as jest.MockedFunction<typeof execFileSync>;

// Mock PluginLoader
jest.mock('@src/plugins/PluginLoader', () => ({
  PLUGINS_DIR: '/mock/plugins',
  loadPlugin: jest.fn(),
}));

const mockLoadPlugin = loadPlugin as jest.MockedFunction<typeof loadPlugin>;

const validManifest = {
  displayName: 'Test LLM Provider',
  description: 'A test LLM provider plugin',
  type: 'llm' as const,
};

const validModule = {
  manifest: validManifest,
  create: jest.fn(),
};

function accessNotFound() {
  const err: any = new Error('ENOENT');
  err.code = 'ENOENT';
  return Promise.reject(err);
}

describe('PluginManager - Enhanced Tests', () => {
  let mockSecurityPolicy: jest.Mocked<PluginSecurityPolicy>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFileSync.mockReturnValue(Buffer.from(''));
    mockLoadPlugin.mockReturnValue(validModule);

    // Default fs mocks
    mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);

    mockReadFile.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith('registry.json')) return Promise.resolve(JSON.stringify([]));
      return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' }));
    });

    // Mock security policy
    mockSecurityPolicy = {
      verifyAndSetTrust: jest.fn(),
      recordUnload: jest.fn(),
      getAllSecurityStatus: jest.fn().mockReturnValue([]),
    } as any;

    setSecurityPolicy(mockSecurityPolicy);
  });

  describe('URL Validation - Edge Cases', () => {
    it('should reject empty URL', async () => {
      await expect(installPlugin('')).rejects.toThrow(PluginValidationError);
    });

    it('should reject null or undefined URL', async () => {
      await expect(installPlugin(null as any)).rejects.toThrow(PluginValidationError);
      await expect(installPlugin(undefined as any)).rejects.toThrow(PluginValidationError);
    });

    it('should reject URL with spaces in path', async () => {
      await expect(installPlugin('https://github.com/user/repo name')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should reject URL with malformed URI sequences', async () => {
      await expect(installPlugin('https://github.com/%ZZ')).rejects.toThrow(PluginValidationError);
    });

    it('should reject URLs with argument injection in href', async () => {
      await expect(installPlugin('https://github.com/repo?--upload-pack=evil')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should reject URLs with shell metacharacters', async () => {
      const dangerousChars = [';', '&', '|', '`', '$', '(', ')'];

      for (const char of dangerousChars) {
        await expect(installPlugin(`https://host${char}name.com/repo`)).rejects.toThrow(
          PluginValidationError
        );
      }
    });

    it('should reject ftp:// protocol', async () => {
      await expect(installPlugin('ftp://example.com/repo')).rejects.toThrow(PluginValidationError);
    });

    it('should reject ssh:// protocol', async () => {
      await expect(installPlugin('ssh://git@github.com/user/repo')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should accept valid https URL', async () => {
      const result = await installPlugin('https://github.com/user/llm-myprovider');
      expect(result.name).toBe('llm-myprovider');
    });

    it('should accept valid http URL', async () => {
      const result = await installPlugin('http://localhost:3000/llm-myprovider');
      expect(result.name).toBe('llm-myprovider');
    });
  });

  describe('installPlugin - Enhanced Coverage', () => {
    it('should create plugins directory if it does not exist', async () => {
      await installPlugin('https://github.com/user/llm-provider');

      expect(mockMkdir).toHaveBeenCalledWith(PLUGINS_DIR, { recursive: true });
    });

    it('should run git clone with correct arguments', async () => {
      const repoUrl = 'https://github.com/user/llm-test';
      await installPlugin(repoUrl);

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['clone', '--depth', '1', repoUrl]),
        expect.any(Object)
      );
    });

    it('should run pnpm install with --ignore-scripts', async () => {
      await installPlugin('https://github.com/user/llm-provider');

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'pnpm',
        expect.arrayContaining(['install', '--prod', '--ignore-scripts']),
        expect.any(Object)
      );
    });

    it('should verify security policy after installation', async () => {
      await installPlugin('https://github.com/user/llm-provider');

      expect(mockSecurityPolicy.verifyAndSetTrust).toHaveBeenCalledWith(
        'llm-myprovider',
        expect.any(Object)
      );
    });

    it('should write to registry after successful installation', async () => {
      const result = await installPlugin('https://github.com/user/llm-provider');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('registry.json'),
        expect.stringContaining(result.name)
      );
    });

    it('should handle package.json without version field', async () => {
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('package.json')) {
          return Promise.resolve(JSON.stringify({ name: 'llm-noversion' }));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const result = await installPlugin('https://github.com/user/llm-noversion');
      expect(result.version).toBe('0.0.0');
    });

    it('should handle package.json read error', async () => {
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('package.json')) {
          throw new Error('Read error');
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const result = await installPlugin('https://github.com/user/llm-provider');
      expect(result.version).toBe('0.0.0');
    });

    it('should cleanup temp directory even if it does not exist', async () => {
      mockAccess.mockImplementation((p: string) => {
        if (String(p).includes('_install_')) return accessNotFound();
        return accessNotFound();
      });
      mockExecFileSync.mockImplementationOnce(() => {
        throw new Error('Clone failed');
      });

      await expect(installPlugin('https://github.com/user/llm-bad')).rejects.toThrow();

      // Should not throw even if temp path doesn't exist
      expect(mockRm).toHaveBeenCalled();
    });

    it('should derive name from scoped package', async () => {
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('package.json')) {
          return Promise.resolve(JSON.stringify({ name: '@scope/llm-scoped', version: '1.0.0' }));
        }
        return Promise.resolve(JSON.stringify([]));
      });

      const result = await installPlugin('https://github.com/scope/llm-scoped');
      expect(result.name).toBe('llm-scoped');
    });

    it('should handle git clone failure', async () => {
      mockExecFileSync.mockImplementationOnce(() => {
        throw new Error('Repository not found');
      });

      await expect(installPlugin('https://github.com/user/nonexistent')).rejects.toThrow(
        'Repository not found'
      );
    });

    it('should handle pnpm install failure', async () => {
      mockExecFileSync.mockImplementationOnce(() => Buffer.from('')); // git clone succeeds
      mockExecFileSync.mockImplementationOnce(() => {
        throw new Error('Package not found');
      });

      await expect(installPlugin('https://github.com/user/llm-bad-deps')).rejects.toThrow(
        'Package not found'
      );
    });
  });

  describe('uninstallPlugin - Enhanced Coverage', () => {
    beforeEach(() => {
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
    });

    it('should record unload in security policy', async () => {
      await uninstallPlugin('llm-myprovider');

      expect(mockSecurityPolicy.recordUnload).toHaveBeenCalledWith('llm-myprovider');
    });

    it('should evict plugin from require cache', async () => {
      // This is hard to test directly, but we can verify it doesn't throw
      await uninstallPlugin('llm-myprovider');

      expect(mockRm).toHaveBeenCalled();
    });

    it('should remove from registry', async () => {
      await uninstallPlugin('llm-myprovider');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('registry.json'),
        expect.not.stringContaining('llm-myprovider')
      );
    });

    it('should handle ENOENT error correctly', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await expect(uninstallPlugin('llm-notfound')).rejects.toThrow('not found');
    });

    it('should propagate non-ENOENT errors', async () => {
      mockAccess.mockRejectedValue(new Error('Permission denied'));

      await expect(uninstallPlugin('llm-myprovider')).rejects.toThrow('Permission denied');
    });

    it('should handle rm failure', async () => {
      mockRm.mockRejectedValue(new Error('Cannot remove directory'));

      await expect(uninstallPlugin('llm-myprovider')).rejects.toThrow('Cannot remove directory');
    });
  });

  describe('updatePlugin - Enhanced Coverage', () => {
    beforeEach(() => {
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
        return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '2.0.0' }));
      });
    });

    it('should run git pull with --ff-only', async () => {
      await updatePlugin('llm-myprovider');

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'git',
        ['pull', '--ff-only'],
        expect.any(Object)
      );
    });

    it('should run pnpm install after pull', async () => {
      await updatePlugin('llm-myprovider');

      expect(mockExecFileSync).toHaveBeenCalledWith(
        'pnpm',
        expect.arrayContaining(['install', '--prod', '--ignore-scripts']),
        expect.any(Object)
      );
    });

    it('should re-verify security after update', async () => {
      await updatePlugin('llm-myprovider');

      expect(mockSecurityPolicy.verifyAndSetTrust).toHaveBeenCalled();
    });

    it('should preserve installedAt timestamp', async () => {
      const result = await updatePlugin('llm-myprovider');

      expect(result.installedAt).toBe('2026-01-01');
    });

    it('should update updatedAt timestamp', async () => {
      const beforeTime = Date.now();
      await updatePlugin('llm-myprovider');

      const writeCalls = (mockWriteFile as jest.Mock).mock.calls;
      const registryData = JSON.parse(writeCalls[writeCalls.length - 1][1]);
      const updatedAt = new Date(registryData[0].updatedAt).getTime();

      expect(updatedAt).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should update version from package.json', async () => {
      const result = await updatePlugin('llm-myprovider');

      expect(result.version).toBe('2.0.0');
    });

    it('should handle plugin not found', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await expect(updatePlugin('llm-notfound')).rejects.toThrow('not found');
    });

    it('should handle git pull failure', async () => {
      mockExecFileSync.mockImplementationOnce(() => {
        throw new Error('Merge conflict');
      });

      await expect(updatePlugin('llm-myprovider')).rejects.toThrow('Merge conflict');
    });

    it('should preserve repoUrl when not in registry', async () => {
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('registry.json')) {
          return Promise.resolve(JSON.stringify([]));
        }
        return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '2.0.0' }));
      });

      const result = await updatePlugin('llm-myprovider');

      expect(result.repoUrl).toBe('');
    });
  });

  describe('listInstalledPlugins - Enhanced Coverage', () => {
    it('should return empty array when directory does not exist', async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const result = await listInstalledPlugins();

      expect(result).toEqual([]);
    });

    it('should propagate non-ENOENT errors', async () => {
      mockAccess.mockRejectedValue(new Error('Permission denied'));

      await expect(listInstalledPlugins()).rejects.toThrow('Permission denied');
    });

    it('should skip _install_ directories', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: '_install_12345', isDirectory: () => true },
        { name: 'llm-myprovider', isDirectory: () => true },
      ] as any);

      const result = await listInstalledPlugins();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('llm-myprovider');
    });

    it('should skip files (non-directories)', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'registry.json', isDirectory: () => false },
        { name: 'llm-myprovider', isDirectory: () => true },
      ] as any);

      const result = await listInstalledPlugins();

      expect(result).toHaveLength(1);
    });

    it('should handle plugins not in registry', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'llm-myprovider', isDirectory: () => true }] as any);
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('registry.json')) return Promise.resolve(JSON.stringify([]));
        return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' }));
      });

      const result = await listInstalledPlugins();

      expect(result).toHaveLength(1);
      expect(result[0].repoUrl).toBe('');
    });

    it('should merge registry data with filesystem data', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([{ name: 'llm-myprovider', isDirectory: () => true }] as any);
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('registry.json')) {
          return Promise.resolve(
            JSON.stringify([
              {
                name: 'llm-myprovider',
                repoUrl: 'https://github.com/user/llm-myprovider',
                installedAt: '2026-01-01',
                updatedAt: '2026-01-02',
                version: '0.9.0',
              },
            ])
          );
        }
        return Promise.resolve(JSON.stringify({ name: 'llm-myprovider', version: '1.0.0' }));
      });

      const result = await listInstalledPlugins();

      expect(result[0].repoUrl).toBe('https://github.com/user/llm-myprovider');
      expect(result[0].version).toBe('1.0.0'); // Uses current version from package.json
    });

    it('should skip directories that fail to load', async () => {
      mockAccess.mockResolvedValue(undefined);
      mockReaddir.mockResolvedValue([
        { name: 'broken-plugin', isDirectory: () => true },
        { name: 'llm-myprovider', isDirectory: () => true },
      ] as any);

      let loadCallCount = 0;
      mockLoadPlugin.mockImplementation((name: string) => {
        loadCallCount++;
        if (name === 'broken-plugin') {
          throw new Error('Failed to load');
        }
        return validModule;
      });

      const result = await listInstalledPlugins();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('llm-myprovider');
    });
  });

  describe('Security Policy Integration', () => {
    it('should get security policy singleton', () => {
      const policy = getSecurityPolicy();

      expect(policy).toBeDefined();
      expect(policy).toBe(mockSecurityPolicy);
    });

    it('should allow setting custom security policy', () => {
      const customPolicy = {
        verifyAndSetTrust: jest.fn(),
        recordUnload: jest.fn(),
        getAllSecurityStatus: jest.fn(),
      } as any;

      setSecurityPolicy(customPolicy);

      expect(getSecurityPolicy()).toBe(customPolicy);
    });

    it('should get plugin security status', () => {
      const mockStatus = [{ pluginName: 'llm-test', trusted: true, violations: [] }];
      mockSecurityPolicy.getAllSecurityStatus.mockReturnValue(mockStatus as any);

      const status = getPluginSecurityStatus();

      expect(status).toEqual(mockStatus);
      expect(mockSecurityPolicy.getAllSecurityStatus).toHaveBeenCalled();
    });
  });

  describe('Manifest Validation - Extended', () => {
    it('should reject manifest without displayName', async () => {
      mockLoadPlugin.mockReturnValue({
        manifest: { ...validManifest, displayName: '' },
        create: jest.fn(),
      });

      await expect(installPlugin('https://github.com/user/llm-bad')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should reject manifest with non-string displayName', async () => {
      mockLoadPlugin.mockReturnValue({
        manifest: { ...validManifest, displayName: 123 as any },
        create: jest.fn(),
      });

      await expect(installPlugin('https://github.com/user/llm-bad')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should reject manifest without description', async () => {
      mockLoadPlugin.mockReturnValue({
        manifest: { ...validManifest, description: '' },
        create: jest.fn(),
      });

      await expect(installPlugin('https://github.com/user/llm-bad')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should reject manifest with non-string description', async () => {
      mockLoadPlugin.mockReturnValue({
        manifest: { ...validManifest, description: null as any },
        create: jest.fn(),
      });

      await expect(installPlugin('https://github.com/user/llm-bad')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should reject manifest without type', async () => {
      mockLoadPlugin.mockReturnValue({
        manifest: { displayName: 'Test', description: 'Test', type: undefined as any },
        create: jest.fn(),
      });

      await expect(installPlugin('https://github.com/user/llm-bad')).rejects.toThrow(
        PluginValidationError
      );
    });

    it('should reject invalid type prefixes', async () => {
      const invalidPrefixes = ['invalid', 'plugin', 'custom', 'test'];

      for (const prefix of invalidPrefixes) {
        mockReadFile.mockImplementation((filePath: string) => {
          if (String(filePath).endsWith('package.json')) {
            return Promise.resolve(JSON.stringify({ name: `${prefix}-test`, version: '1.0.0' }));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        await expect(installPlugin(`https://github.com/user/${prefix}-test`)).rejects.toThrow(
          PluginValidationError
        );
      }
    });

    it('should accept valid type prefixes', async () => {
      const validPrefixes = ['llm', 'message', 'memory', 'tool'];

      for (const prefix of validPrefixes) {
        mockReadFile.mockImplementation((filePath: string) => {
          if (String(filePath).endsWith('package.json')) {
            return Promise.resolve(JSON.stringify({ name: `${prefix}-test`, version: '1.0.0' }));
          }
          return Promise.resolve(JSON.stringify([]));
        });

        mockLoadPlugin.mockReturnValue({
          manifest: { ...validManifest, type: prefix as any },
          create: jest.fn(),
        });

        const result = await installPlugin(`https://github.com/user/${prefix}-test`);
        expect(result.manifest.type).toBe(prefix);

        // Reset for next iteration
        mockAccess.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      }
    });
  });

  describe('Registry Operations', () => {
    it('should handle corrupt registry.json', async () => {
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('registry.json')) {
          return Promise.resolve('{ invalid json');
        }
        return Promise.resolve(JSON.stringify({ name: 'llm-test', version: '1.0.0' }));
      });

      const result = await installPlugin('https://github.com/user/llm-test');

      expect(result.name).toBe('llm-test');
    });

    it('should handle missing registry.json', async () => {
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('registry.json')) {
          return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
        }
        return Promise.resolve(JSON.stringify({ name: 'llm-test', version: '1.0.0' }));
      });

      const result = await installPlugin('https://github.com/user/llm-test');

      expect(result.name).toBe('llm-test');
    });

    it('should handle registry read error (non-ENOENT)', async () => {
      mockReadFile.mockImplementation((filePath: string) => {
        if (String(filePath).endsWith('registry.json')) {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve(JSON.stringify({ name: 'llm-test', version: '1.0.0' }));
      });

      // Should still work by treating it as empty registry
      const result = await installPlugin('https://github.com/user/llm-test');
      expect(result.name).toBe('llm-test');
    });
  });
});
