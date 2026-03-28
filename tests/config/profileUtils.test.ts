import { getProfilesPath, findProfileByKey } from '../../src/config/profileUtils';
import path from 'path';

describe('profileUtils', () => {
  describe('getProfilesPath', () => {
    it('should use NODE_CONFIG_DIR when set', () => {
      const originalDir = process.env.NODE_CONFIG_DIR;
      process.env.NODE_CONFIG_DIR = '/custom/config';
      const result = getProfilesPath('test.json');
      expect(result).toBe(path.join('/custom/config', 'test.json'));
      process.env.NODE_CONFIG_DIR = originalDir;
    });

    it('should fallback to cwd/config when NODE_CONFIG_DIR is not set', () => {
      const originalDir = process.env.NODE_CONFIG_DIR;
      delete process.env.NODE_CONFIG_DIR;
      const result = getProfilesPath('test.json');
      expect(result).toBe(path.join(process.cwd(), 'config', 'test.json'));
      process.env.NODE_CONFIG_DIR = originalDir;
    });

    it('should handle nested filenames', () => {
      const originalDir = process.env.NODE_CONFIG_DIR;
      process.env.NODE_CONFIG_DIR = '/config';
      const result = getProfilesPath('sub/test.json');
      expect(result).toBe('/config/sub/test.json');
      process.env.NODE_CONFIG_DIR = originalDir;
    });
  });

  describe('findProfileByKey', () => {
    const profiles = [
      { name: 'Alpha', id: '1' },
      { name: 'Beta', id: '2' },
      { name: 'Gamma', id: '3' },
    ];

    it('should find a profile by key (case-insensitive)', () => {
      const result = findProfileByKey(profiles, 'name', 'alpha');
      expect(result).toEqual({ name: 'Alpha', id: '1' });
    });

    it('should find with uppercase search', () => {
      const result = findProfileByKey(profiles, 'name', 'BETA');
      expect(result).toEqual({ name: 'Beta', id: '2' });
    });

    it('should trim the search value', () => {
      const result = findProfileByKey(profiles, 'name', '  Beta  ');
      expect(result).toEqual({ name: 'Beta', id: '2' });
    });

    it('should return undefined when not found', () => {
      const result = findProfileByKey(profiles, 'name', 'Delta');
      expect(result).toBeUndefined();
    });

    it('should handle numeric key fields gracefully', () => {
      const result = findProfileByKey(profiles, 'id', '2');
      expect(result).toEqual({ name: 'Beta', id: '2' });
    });

    it('should handle empty profiles array', () => {
      const result = findProfileByKey([], 'name' as any, 'test');
      expect(result).toBeUndefined();
    });

    it('should handle empty search string', () => {
      const result = findProfileByKey(profiles, 'name', '');
      expect(result).toBeUndefined();
    });
  });
});
