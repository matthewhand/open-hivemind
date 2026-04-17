import * as fs from 'fs';
import * as path from 'path';
import { SyncProviderRegistry } from '@src/registries/SyncProviderRegistry';

describe('SyncProviderRegistry Loading Integration', () => {
  const originalEnv = { ...process.env };
  const testConfigDir = path.join(process.cwd(), 'config', 'sync-test');

  beforeAll(() => {
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    process.env.NODE_CONFIG_DIR = testConfigDir;
  });

  afterAll(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    process.env = originalEnv;
  });

  it('should be initialized via singleton', () => {
    const registry = SyncProviderRegistry.getInstance();
    expect(registry).toBeDefined();
    // Default state before init
    expect(registry.isInitialized()).toBe(false);
  });

  it('should gracefully handle empty configurations during init', async () => {
    const registry = SyncProviderRegistry.getInstance();
    const result = await registry.initialize();

    expect(result.failed).toHaveLength(0);
    expect(registry.isInitialized()).toBe(true);
    // Should have 0 providers if config dir is empty
    expect(registry.getLlmProviders()).toHaveLength(0);
  });
});
