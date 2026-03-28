/**
 * Unit tests for memoryProfiles config.
 *
 * Tests cover: loadMemoryProfiles, saveMemoryProfiles, getMemoryProfileByKey,
 * getMemoryProfiles, validation/migration, and default scaffolding.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// We control NODE_CONFIG_DIR via a temp directory so we don't pollute the real config
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-profiles-'));
  process.env.NODE_CONFIG_DIR = tmpDir;
  // Clear module cache so profileUtils re-reads NODE_CONFIG_DIR
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.NODE_CONFIG_DIR;
});

function loadModule() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../src/config/memoryProfiles');
}

describe('memoryProfiles', () => {
  describe('loadMemoryProfiles', () => {
    it('returns defaults when file does not exist', () => {
      const { loadMemoryProfiles } = loadModule();
      const profiles = loadMemoryProfiles();
      expect(profiles).toEqual({ memory: [] });
    });

    it('creates scaffolding file when missing', () => {
      const { loadMemoryProfiles } = loadModule();
      loadMemoryProfiles();
      const filePath = path.join(tmpDir, 'memory-profiles.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(content).toEqual({ memory: [] });
    });

    it('reads existing profiles from disk', () => {
      const data = {
        memory: [
          { key: 'mem0', name: 'Mem0', provider: 'mem0', config: { apiKey: 'test' } },
        ],
      };
      fs.writeFileSync(path.join(tmpDir, 'memory-profiles.json'), JSON.stringify(data));

      const { loadMemoryProfiles } = loadModule();
      const profiles = loadMemoryProfiles();
      expect(profiles.memory).toHaveLength(1);
      expect(profiles.memory[0].key).toBe('mem0');
    });

    it('returns defaults for corrupt JSON', () => {
      fs.writeFileSync(path.join(tmpDir, 'memory-profiles.json'), '{invalid json!!!');
      const { loadMemoryProfiles } = loadModule();
      const profiles = loadMemoryProfiles();
      expect(profiles).toEqual({ memory: [] });
    });

    it('migrates missing memory array to empty array', () => {
      fs.writeFileSync(path.join(tmpDir, 'memory-profiles.json'), JSON.stringify({ other: 'field' }));
      const { loadMemoryProfiles } = loadModule();
      const profiles = loadMemoryProfiles();
      expect(profiles).toEqual({ memory: [] });
    });
  });

  describe('saveMemoryProfiles', () => {
    it('writes profiles to disk', () => {
      const { saveMemoryProfiles } = loadModule();
      const data = {
        memory: [{ key: 'test', name: 'Test', provider: 'mem0', config: {} }],
      };
      saveMemoryProfiles(data);

      const filePath = path.join(tmpDir, 'memory-profiles.json');
      const written = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(written.memory).toHaveLength(1);
      expect(written.memory[0].key).toBe('test');
    });

    it('creates directory if missing', () => {
      // Use a nested dir that doesn't exist yet
      const nestedDir = path.join(tmpDir, 'nested', 'deep');
      process.env.NODE_CONFIG_DIR = nestedDir;
      jest.resetModules();
      const { saveMemoryProfiles } = loadModule();
      saveMemoryProfiles({ memory: [] });
      expect(fs.existsSync(path.join(nestedDir, 'memory-profiles.json'))).toBe(true);
    });
  });

  describe('getMemoryProfileByKey', () => {
    it('finds a profile by key (case-insensitive)', () => {
      const data = {
        memory: [
          { key: 'Mem0-Main', name: 'Main Mem0', provider: 'mem0', config: {} },
        ],
      };
      fs.writeFileSync(path.join(tmpDir, 'memory-profiles.json'), JSON.stringify(data));

      const { getMemoryProfileByKey } = loadModule();
      const result = getMemoryProfileByKey('mem0-main');
      expect(result).toBeDefined();
      expect(result!.key).toBe('Mem0-Main');
    });

    it('returns undefined for non-existent key', () => {
      fs.writeFileSync(path.join(tmpDir, 'memory-profiles.json'), JSON.stringify({ memory: [] }));
      const { getMemoryProfileByKey } = loadModule();
      expect(getMemoryProfileByKey('nope')).toBeUndefined();
    });

    it('trims whitespace from lookup key', () => {
      const data = {
        memory: [{ key: 'trimtest', name: 'Trim', provider: 'x', config: {} }],
      };
      fs.writeFileSync(path.join(tmpDir, 'memory-profiles.json'), JSON.stringify(data));

      const { getMemoryProfileByKey } = loadModule();
      expect(getMemoryProfileByKey('  trimtest  ')).toBeDefined();
    });
  });

  describe('getMemoryProfiles', () => {
    it('is an alias for loadMemoryProfiles', () => {
      const { getMemoryProfiles, loadMemoryProfiles } = loadModule();
      const a = getMemoryProfiles();
      const b = loadMemoryProfiles();
      expect(a).toEqual(b);
    });
  });
});
