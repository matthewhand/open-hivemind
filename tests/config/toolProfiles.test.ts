/**
 * Unit tests for toolProfiles config.
 *
 * Tests cover: loadToolProfiles, saveToolProfiles, getToolProfileByKey,
 * getToolProfiles, validation/migration, and default scaffolding.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-profiles-'));
  process.env.NODE_CONFIG_DIR = tmpDir;
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.NODE_CONFIG_DIR;
});

function loadModule() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../src/config/toolProfiles');
}

describe('toolProfiles', () => {
  describe('loadToolProfiles', () => {
    it('returns defaults when file does not exist', () => {
      const { loadToolProfiles } = loadModule();
      const profiles = loadToolProfiles();
      expect(profiles).toEqual({ tool: [] });
    });

    it('creates scaffolding file when missing', () => {
      const { loadToolProfiles } = loadModule();
      loadToolProfiles();
      const filePath = path.join(tmpDir, 'tool-profiles.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('reads existing profiles from disk', () => {
      const data = {
        tool: [
          { key: 'mcp-main', name: 'MCP Main', provider: 'mcp', config: { serverUrl: 'http://localhost' } },
        ],
      };
      fs.writeFileSync(path.join(tmpDir, 'tool-profiles.json'), JSON.stringify(data));

      const { loadToolProfiles } = loadModule();
      const profiles = loadToolProfiles();
      expect(profiles.tool).toHaveLength(1);
      expect(profiles.tool[0].key).toBe('mcp-main');
    });

    it('returns defaults for corrupt JSON', () => {
      fs.writeFileSync(path.join(tmpDir, 'tool-profiles.json'), 'not-json');
      const { loadToolProfiles } = loadModule();
      const profiles = loadToolProfiles();
      expect(profiles).toEqual({ tool: [] });
    });

    it('migrates missing tool array to empty array', () => {
      fs.writeFileSync(path.join(tmpDir, 'tool-profiles.json'), JSON.stringify({ unrelated: true }));
      const { loadToolProfiles } = loadModule();
      const profiles = loadToolProfiles();
      expect(profiles).toEqual({ tool: [] });
    });
  });

  describe('saveToolProfiles', () => {
    it('writes profiles to disk', () => {
      const { saveToolProfiles } = loadModule();
      const data = {
        tool: [{ key: 'test-tool', name: 'Test', provider: 'mcp', config: {} }],
      };
      saveToolProfiles(data);

      const filePath = path.join(tmpDir, 'tool-profiles.json');
      const written = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(written.tool).toHaveLength(1);
      expect(written.tool[0].key).toBe('test-tool');
    });

    it('creates directory if missing', () => {
      const nestedDir = path.join(tmpDir, 'nested', 'dir');
      process.env.NODE_CONFIG_DIR = nestedDir;
      jest.resetModules();
      const { saveToolProfiles } = loadModule();
      saveToolProfiles({ tool: [] });
      expect(fs.existsSync(path.join(nestedDir, 'tool-profiles.json'))).toBe(true);
    });
  });

  describe('getToolProfileByKey', () => {
    it('finds a profile by key (case-insensitive)', () => {
      const data = {
        tool: [{ key: 'MCP-Server', name: 'Server', provider: 'mcp', config: {} }],
      };
      fs.writeFileSync(path.join(tmpDir, 'tool-profiles.json'), JSON.stringify(data));

      const { getToolProfileByKey } = loadModule();
      const result = getToolProfileByKey('mcp-server');
      expect(result).toBeDefined();
      expect(result!.key).toBe('MCP-Server');
    });

    it('returns undefined for non-existent key', () => {
      fs.writeFileSync(path.join(tmpDir, 'tool-profiles.json'), JSON.stringify({ tool: [] }));
      const { getToolProfileByKey } = loadModule();
      expect(getToolProfileByKey('nope')).toBeUndefined();
    });

    it('trims whitespace from lookup key', () => {
      const data = {
        tool: [{ key: 'trimkey', name: 'Trim', provider: 'x', config: {} }],
      };
      fs.writeFileSync(path.join(tmpDir, 'tool-profiles.json'), JSON.stringify(data));

      const { getToolProfileByKey } = loadModule();
      expect(getToolProfileByKey('  trimkey  ')).toBeDefined();
    });
  });

  describe('getToolProfiles', () => {
    it('is an alias for loadToolProfiles', () => {
      const { getToolProfiles, loadToolProfiles } = loadModule();
      const a = getToolProfiles();
      const b = loadToolProfiles();
      expect(a).toEqual(b);
    });
  });
});
