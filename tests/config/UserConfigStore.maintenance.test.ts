/**
 * Tests for UserConfigStore maintenance mode functionality
 */

import { UserConfigStore } from '../../src/config/UserConfigStore';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('fs/promises');

describe('UserConfigStore - Maintenance Mode', () => {
  let userConfigStore: UserConfigStore;
  const mockConfigPath = '/mock/config/user-config.json';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs.readFileSync for constructor
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === mockConfigPath) {
        return JSON.stringify({
          generalSettings: {
            'app.maintenanceMode': false,
          },
        });
      }
      return '{}';
    });

    // Mock process.cwd
    const originalCwd = process.cwd;
    (process.cwd as jest.Mock) = jest.fn(() => path.dirname(mockConfigPath));

    userConfigStore = UserConfigStore.getInstance();
    
    // Reset singleton for clean test
    (UserConfigStore as any).instance = undefined;
  });

  describe('isMaintenanceMode()', () => {
    it('should return false when app.maintenanceMode is not set', () => {
      const store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(false);
    });

    it('should return false when app.maintenanceMode is false', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        return JSON.stringify({
          generalSettings: {
            'app.maintenanceMode': false,
          },
        });
      });
      (UserConfigStore as any).instance = undefined;
      const store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(false);
    });

    it('should return true when app.maintenanceMode is true', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        return JSON.stringify({
          generalSettings: {
            'app.maintenanceMode': true,
          },
        });
      });
      (UserConfigStore as any).instance = undefined;
      const store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(true);
    });

    it('should return false when generalSettings is empty', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        return JSON.stringify({});
      });
      (UserConfigStore as any).instance = undefined;
      const store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(false);
    });
  });

  describe('setGeneralSettings() with maintenance mode', () => {
    it('should set app.maintenanceMode to true', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        return JSON.stringify({
          generalSettings: {},
        });
      });
      (UserConfigStore as any).instance = undefined;
      
      const store = new UserConfigStore();
      await store.setGeneralSettings({ 'app.maintenanceMode': true });
      
      expect(store.isMaintenanceMode()).toBe(true);
    });

    it('should set app.maintenanceMode to false', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        return JSON.stringify({
          generalSettings: {
            'app.maintenanceMode': true,
          },
        });
      });
      (UserConfigStore as any).instance = undefined;
      
      const store = new UserConfigStore();
      expect(store.isMaintenanceMode()).toBe(true);
      
      await store.setGeneralSettings({ 'app.maintenanceMode': false });
      
      expect(store.isMaintenanceMode()).toBe(false);
    });
  });
});
