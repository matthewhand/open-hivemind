/**
 * Unit tests for initProviders.
 *
 * Tests cover: provider file discovery, dynamic import, duck-type registration,
 * error handling for missing directory, and SwarmInstaller registration.
 */

import fs from 'fs';
import path from 'path';

// We need to mock modules before import
jest.mock('../../src/registries/ProviderRegistry', () => {
  const register = jest.fn();
  const registerInstaller = jest.fn();
  return {
    providerRegistry: { register, registerInstaller },
    ProviderRegistry: { getInstance: () => ({ register, registerInstaller }) },
  };
});

jest.mock('../../src/integrations/openswarm/SwarmInstaller', () => ({
  SwarmInstaller: jest.fn().mockImplementation(() => ({
    id: 'openswarm',
    label: 'OpenSwarm',
  })),
}));

import { initProviders } from '../../src/initProviders';
import { providerRegistry } from '../../src/registries/ProviderRegistry';

describe('initProviders', () => {
  const mockRegister = providerRegistry.register as jest.Mock;
  const mockRegisterInstaller = providerRegistry.registerInstaller as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('always registers SwarmInstaller', async () => {
    // Mock providers directory as non-existent
    jest.spyOn(fs.promises, 'access').mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    await initProviders();

    expect(mockRegisterInstaller).toHaveBeenCalledTimes(1);
    expect(mockRegisterInstaller).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'openswarm' })
    );
  });

  it('handles missing providers directory gracefully', async () => {
    jest.spyOn(fs.promises, 'access').mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    // Should not throw
    await expect(initProviders()).resolves.not.toThrow();
  });

  it('reads .ts and .js files from providers directory', async () => {
    jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'readdir').mockResolvedValue([
      'FooProvider.ts',
      'BarProvider.js',
      'ignored.d.ts',
      'something.test.ts',
      'another.spec.ts',
      'readme.md',
    ] as any);

    // We need to mock the dynamic import. Since initProviders uses `import(filePath)`,
    // we can't easily intercept it. Instead we verify it doesn't crash.
    // The dynamic import will fail because the files don't exist, which is caught internally.
    await initProviders();

    // Should not have crashed; SwarmInstaller still registered
    expect(mockRegisterInstaller).toHaveBeenCalledTimes(1);
  });

  it('registers providers that pass duck-type check', async () => {
    jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['TestProvider.ts'] as any);

    // We need to make the dynamic import work. We'll create a temp file.
    const providersDir = path.join(__dirname, '../../src/providers');
    const tmpFile = path.join(providersDir, '__test_duck_provider.js');

    // Write a temporary provider file
    const providerCode = `
class DuckProvider {
  constructor() {
    this.id = 'duck-test';
    this.type = 'messenger';
    this.label = 'Duck';
  }
  getConfig() { return {}; }
  getSchema() { return {}; }
  getSensitiveKeys() { return []; }
}
module.exports = { DuckProvider };
`;

    try {
      fs.mkdirSync(providersDir, { recursive: true });
      fs.writeFileSync(tmpFile, providerCode);

      // Reset mocks to read the actual directory with our test file
      (fs.promises.access as jest.Mock).mockRestore();
      (fs.promises.readdir as jest.Mock).mockRestore();

      jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);
      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['__test_duck_provider.js'] as any);

      await initProviders();

      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'duck-test', type: 'messenger' })
      );
    } finally {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  });

  it('rethrows non-ENOENT errors from providers directory access', async () => {
    const permError = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    jest.spyOn(fs.promises, 'access').mockRejectedValue(permError);

    await expect(initProviders()).rejects.toThrow('EACCES');
  });
});
