import { UserConfigStore } from '../../src/config/UserConfigStore';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('UserConfigStore - Maintenance Mode', () => {
  let store: UserConfigStore;
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'user-config-test-'));
    process.chdir(testDir);
    fs.mkdirSync(path.join(testDir, 'config', 'user'), { recursive: true });
    process.env.DISABLE_ENCRYPTION = 'true';
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    (UserConfigStore as any).instance = undefined;
    const configPath = path.join(testDir, 'config', 'user-config.json');
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  describe('isMaintenanceMode()', () => {
    it('should return false when app.maintenanceMode is not set', () => {
      store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(false);
    });

    it('should return true when app.maintenanceMode is true', () => {
      const configPath = path.join(testDir, 'config', 'user-config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        generalSettings: {
          'app.maintenanceMode': true,
        },
      }));
      store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(true);
    });
  });

  describe('setGeneralSettings()', () => {
    it('should set app.maintenanceMode to true', async () => {
      store = new UserConfigStore();
      await store.setGeneralSettings({ 'app.maintenanceMode': true });
      expect(store.isMaintenanceMode()).toBe(true);
    });

    it('should set app.maintenanceMode to false', async () => {
      const configPath = path.join(testDir, 'config', 'user-config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        generalSettings: {
          'app.maintenanceMode': true,
        },
      }));
      store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(true);
      
      await store.setGeneralSettings({ 'app.maintenanceMode': false });
      expect(store.isMaintenanceMode()).toBe(false);
    });
  });
});
