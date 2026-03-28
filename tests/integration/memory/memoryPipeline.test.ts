/**
 * Integration test: memory profiles pipeline.
 *
 * Tests the full pipeline of loading, saving, and querying memory profiles
 * through the config layer, simulating how the application would interact
 * with memory provider configuration.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-pipeline-'));
  process.env.NODE_CONFIG_DIR = tmpDir;
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.NODE_CONFIG_DIR;
});

describe('Memory profile pipeline integration', () => {
  it('round-trips profiles through save and load', () => {
    const { loadMemoryProfiles, saveMemoryProfiles } = require('../../../src/config/memoryProfiles');

    const profiles = {
      memory: [
        { key: 'mem0-prod', name: 'Mem0 Production', description: 'Production memory store', provider: 'mem0', config: { apiKey: 'sk-test', orgId: 'org-1' } },
        { key: 'mem0-dev', name: 'Mem0 Dev', provider: 'mem0', config: { apiKey: 'sk-dev' } },
      ],
    };

    saveMemoryProfiles(profiles);

    // Clear module cache to force re-read from disk
    jest.resetModules();
    const reloaded = require('../../../src/config/memoryProfiles');
    const loaded = reloaded.loadMemoryProfiles();

    expect(loaded.memory).toHaveLength(2);
    expect(loaded.memory[0].key).toBe('mem0-prod');
    expect(loaded.memory[0].config.apiKey).toBe('sk-test');
    expect(loaded.memory[1].key).toBe('mem0-dev');
  });

  it('persists profile additions across save cycles', () => {
    const mod1 = require('../../../src/config/memoryProfiles');

    // Start with initial profile
    mod1.saveMemoryProfiles({
      memory: [{ key: 'first', name: 'First', provider: 'mem0', config: {} }],
    });

    // Simulate a second write adding a profile
    jest.resetModules();
    const mod2 = require('../../../src/config/memoryProfiles');
    const existing = mod2.loadMemoryProfiles();
    existing.memory.push({ key: 'second', name: 'Second', provider: 'zep', config: {} });
    mod2.saveMemoryProfiles(existing);

    // Verify both persist
    jest.resetModules();
    const mod3 = require('../../../src/config/memoryProfiles');
    const final = mod3.loadMemoryProfiles();
    expect(final.memory).toHaveLength(2);
    expect(final.memory.map((p: any) => p.key)).toEqual(['first', 'second']);
  });

  it('getMemoryProfileByKey retrieves saved profile', () => {
    const mod = require('../../../src/config/memoryProfiles');
    mod.saveMemoryProfiles({
      memory: [
        { key: 'target', name: 'Target', provider: 'mem0', config: { endpoint: 'https://api.mem0.ai' } },
      ],
    });

    jest.resetModules();
    const { getMemoryProfileByKey } = require('../../../src/config/memoryProfiles');
    const result = getMemoryProfileByKey('target');
    expect(result).toBeDefined();
    expect(result.provider).toBe('mem0');
    expect(result.config.endpoint).toBe('https://api.mem0.ai');
  });

  it('handles concurrent-like saves without corruption', () => {
    const mod = require('../../../src/config/memoryProfiles');

    // Simulate rapid sequential saves
    for (let i = 0; i < 10; i++) {
      mod.saveMemoryProfiles({
        memory: [{ key: `profile-${i}`, name: `P${i}`, provider: 'mem0', config: { index: i } }],
      });
    }

    // The last save should win
    jest.resetModules();
    const { loadMemoryProfiles } = require('../../../src/config/memoryProfiles');
    const loaded = loadMemoryProfiles();
    expect(loaded.memory).toHaveLength(1);
    expect(loaded.memory[0].key).toBe('profile-9');
  });

  it('recovers from corrupted file on disk', () => {
    // Write valid data first
    const mod = require('../../../src/config/memoryProfiles');
    mod.saveMemoryProfiles({
      memory: [{ key: 'good', name: 'Good', provider: 'mem0', config: {} }],
    });

    // Corrupt the file
    fs.writeFileSync(path.join(tmpDir, 'memory-profiles.json'), '{"memory": [BROKEN');

    // Reload should return defaults
    jest.resetModules();
    const { loadMemoryProfiles } = require('../../../src/config/memoryProfiles');
    const loaded = loadMemoryProfiles();
    expect(loaded).toEqual({ memory: [] });
  });
});
