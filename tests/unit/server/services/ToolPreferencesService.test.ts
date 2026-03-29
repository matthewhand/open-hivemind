import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { ToolPreferencesService } from '@src/server/services/ToolPreferencesService';

describe('ToolPreferencesService', () => {
  let service: ToolPreferencesService;
  const testDataFile = path.join(process.cwd(), 'data', 'tool-preferences.json');

  beforeEach(() => {
    // Clear singleton instance
    (ToolPreferencesService as any).instance = undefined;
    service = ToolPreferencesService.getInstance();
  });

  afterEach(async () => {
    // Clean up test data file
    try {
      await fs.promises.unlink(testDataFile);
    } catch {
      // Ignore errors
    }
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = ToolPreferencesService.getInstance();
      const instance2 = ToolPreferencesService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('setToolEnabled', () => {
    it('should set a tool as enabled', async () => {
      const preference = await service.setToolEnabled(
        'server1-tool1',
        'server1',
        'tool1',
        true
      );

      expect(preference.toolId).toBe('server1-tool1');
      expect(preference.serverName).toBe('server1');
      expect(preference.toolName).toBe('tool1');
      expect(preference.enabled).toBe(true);
      expect(preference.updatedAt).toBeDefined();
    });

    it('should set a tool as disabled', async () => {
      const preference = await service.setToolEnabled(
        'server1-tool1',
        'server1',
        'tool1',
        false,
        'user123'
      );

      expect(preference.enabled).toBe(false);
      expect(preference.updatedBy).toBe('user123');
    });

    it('should update existing preference', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', true);
      const updated = await service.setToolEnabled('server1-tool1', 'server1', 'tool1', false);

      expect(updated.enabled).toBe(false);
    });
  });

  describe('bulkSetToolsEnabled', () => {
    it('should set multiple tools enabled/disabled', async () => {
      const tools = [
        { toolId: 'server1-tool1', serverName: 'server1', toolName: 'tool1' },
        { toolId: 'server1-tool2', serverName: 'server1', toolName: 'tool2' },
        { toolId: 'server2-tool1', serverName: 'server2', toolName: 'tool1' },
      ];

      const preferences = await service.bulkSetToolsEnabled(tools, false, 'user123');

      expect(preferences).toHaveLength(3);
      preferences.forEach(pref => {
        expect(pref.enabled).toBe(false);
        expect(pref.updatedBy).toBe('user123');
      });
    });
  });

  describe('getToolPreference', () => {
    it('should return preference if it exists', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', true);
      const preference = service.getToolPreference('server1-tool1');

      expect(preference).toBeDefined();
      expect(preference?.enabled).toBe(true);
    });

    it('should return null if preference does not exist', () => {
      const preference = service.getToolPreference('nonexistent-tool');
      expect(preference).toBeNull();
    });
  });

  describe('getAllPreferences', () => {
    it('should return empty object when no preferences exist', () => {
      const preferences = service.getAllPreferences();
      expect(preferences).toEqual({});
    });

    it('should return all preferences', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', true);
      await service.setToolEnabled('server1-tool2', 'server1', 'tool2', false);

      const preferences = service.getAllPreferences();
      expect(Object.keys(preferences)).toHaveLength(2);
    });
  });

  describe('getPreferencesByServer', () => {
    it('should return preferences for a specific server', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', true);
      await service.setToolEnabled('server1-tool2', 'server1', 'tool2', false);
      await service.setToolEnabled('server2-tool1', 'server2', 'tool1', true);

      const preferences = service.getPreferencesByServer('server1');
      expect(preferences).toHaveLength(2);
      expect(preferences.every(p => p.serverName === 'server1')).toBe(true);
    });

    it('should return empty array for server with no preferences', () => {
      const preferences = service.getPreferencesByServer('nonexistent-server');
      expect(preferences).toEqual([]);
    });
  });

  describe('isToolEnabled', () => {
    it('should return true by default if no preference exists', () => {
      const enabled = service.isToolEnabled('server1-tool1');
      expect(enabled).toBe(true);
    });

    it('should return stored preference value', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', false);
      const enabled = service.isToolEnabled('server1-tool1');
      expect(enabled).toBe(false);
    });
  });

  describe('deletePreference', () => {
    it('should delete a preference', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', true);
      const deleted = await service.deletePreference('server1-tool1');

      expect(deleted).toBe(true);
      expect(service.getToolPreference('server1-tool1')).toBeNull();
    });

    it('should return false if preference does not exist', async () => {
      const deleted = await service.deletePreference('nonexistent-tool');
      expect(deleted).toBe(false);
    });
  });

  describe('deletePreferencesByServer', () => {
    it('should delete all preferences for a server', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', true);
      await service.setToolEnabled('server1-tool2', 'server1', 'tool2', false);
      await service.setToolEnabled('server2-tool1', 'server2', 'tool1', true);

      const count = await service.deletePreferencesByServer('server1');

      expect(count).toBe(2);
      expect(service.getPreferencesByServer('server1')).toEqual([]);
      expect(service.getPreferencesByServer('server2')).toHaveLength(1);
    });

    it('should return 0 if server has no preferences', async () => {
      const count = await service.deletePreferencesByServer('nonexistent-server');
      expect(count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await service.setToolEnabled('server1-tool1', 'server1', 'tool1', true);
      await service.setToolEnabled('server1-tool2', 'server1', 'tool2', false);
      await service.setToolEnabled('server2-tool1', 'server2', 'tool1', true);
      await service.setToolEnabled('server2-tool2', 'server2', 'tool2', false);

      const stats = service.getStats();

      expect(stats.totalPreferences).toBe(4);
      expect(stats.enabledCount).toBe(2);
      expect(stats.disabledCount).toBe(2);
      expect(stats.serverCounts.server1).toEqual({ enabled: 1, disabled: 1 });
      expect(stats.serverCounts.server2).toEqual({ enabled: 1, disabled: 1 });
    });

    it('should return empty stats when no preferences exist', () => {
      const stats = service.getStats();

      expect(stats.totalPreferences).toBe(0);
      expect(stats.enabledCount).toBe(0);
      expect(stats.disabledCount).toBe(0);
      expect(stats.serverCounts).toEqual({});
    });
  });
});
