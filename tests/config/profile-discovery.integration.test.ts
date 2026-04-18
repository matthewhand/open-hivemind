import { getProfilesPath, loadProfiles } from '../../src/config/profileUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('Profile Discovery Integration', () => {
  const originalEnv = { ...process.env };
  const testConfigDir = path.join(process.cwd(), 'config', 'discovery-test');

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

  it('should resolve profiles path correctly using NODE_CONFIG_DIR', () => {
    const profilesPath = getProfilesPath('test-profiles.json');
    expect(profilesPath).toContain('discovery-test');
    expect(profilesPath).toContain('test-profiles.json');
  });

  it('should load profiles from real file on disk', () => {
    const filename = 'test-load.json';
    const fullPath = path.join(testConfigDir, filename);
    const mockData = { items: [{ key: 'val' }] };
    
    fs.writeFileSync(fullPath, JSON.stringify(mockData));
    
    const loaded = loadProfiles({
      filename,
      defaultData: { items: [] },
      validateAndMigrate: (p) => p,
      profileType: 'test'
    });
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0].key).toBe('val');
  });

  it('should return default data when file is missing', () => {
    const loaded = loadProfiles({
      filename: 'missing-file.json',
      defaultData: { items: [{ key: 'default' }] },
      validateAndMigrate: (p) => p,
      profileType: 'test'
    });
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0].key).toBe('default');
  });
});
