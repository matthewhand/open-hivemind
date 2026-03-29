import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import { ToolUsageGuardsManager } from '@src/managers/ToolUsageGuardsManager';

describe('ToolUsageGuardsManager', () => {
  let manager: ToolUsageGuardsManager;
  const testConfigPath = path.join(__dirname, '../../../config/user/test-tool-usage-guards.json');

  beforeEach(async () => {
    manager = ToolUsageGuardsManager.getInstance();
    (manager as any).configPath = testConfigPath;
    (manager as any).guards.clear();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('CRUD Operations', () => {
    it('should create a new guard', () => {
      const guard = manager.createGuard({
        name: 'Test Guard',
        description: 'Test description',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      expect(guard.id).toBeDefined();
      expect(guard.name).toBe('Test Guard');
      expect(guard.toolId).toBe('test-tool');
    });

    it('should retrieve all guards', () => {
      manager.createGuard({
        name: 'Guard 1',
        description: 'Test',
        toolId: 'tool-1',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      manager.createGuard({
        name: 'Guard 2',
        description: 'Test',
        toolId: 'tool-2',
        guardType: 'user_list',
        allowedUsers: ['user2'],
        allowedRoles: [],
        isActive: true,
      });

      const guards = manager.getAllGuards();
      expect(guards).toHaveLength(2);
    });

    it('should get guard by ID', () => {
      const created = manager.createGuard({
        name: 'Test Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      const retrieved = manager.getGuardById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Guard');
    });

    it('should update guard', () => {
      const created = manager.createGuard({
        name: 'Original',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      const updated = manager.updateGuard(created.id, {
        name: 'Updated',
        allowedUsers: ['user1', 'user2'],
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.allowedUsers).toContain('user2');
    });

    it('should delete guard', () => {
      const created = manager.createGuard({
        name: 'Test Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      const deleted = manager.deleteGuard(created.id);
      expect(deleted).toBe(true);
      expect(manager.getGuardById(created.id)).toBeUndefined();
    });

    it('should toggle guard active status', () => {
      const created = manager.createGuard({
        name: 'Test Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      const toggled = manager.toggleGuard(created.id);
      expect(toggled?.isActive).toBe(false);

      const toggledAgain = manager.toggleGuard(created.id);
      expect(toggledAgain?.isActive).toBe(true);
    });
  });

  describe('Access Control', () => {
    it('should allow access for owner_only guard type', () => {
      manager.createGuard({
        name: 'Owner Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['owner1', 'owner2'],
        allowedRoles: [],
        isActive: true,
      });

      expect(manager.isUserAllowedToUseTool('owner1', 'test-tool')).toBe(true);
      expect(manager.isUserAllowedToUseTool('owner2', 'test-tool')).toBe(true);
      expect(manager.isUserAllowedToUseTool('other-user', 'test-tool')).toBe(false);
    });

    it('should allow access for user_list guard type', () => {
      manager.createGuard({
        name: 'User List Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'user_list',
        allowedUsers: ['user1', 'user2'],
        allowedRoles: [],
        isActive: true,
      });

      expect(manager.isUserAllowedToUseTool('user1', 'test-tool')).toBe(true);
      expect(manager.isUserAllowedToUseTool('user3', 'test-tool')).toBe(false);
    });

    it('should allow access for role_based guard type', () => {
      manager.createGuard({
        name: 'Role Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'role_based',
        allowedUsers: [],
        allowedRoles: ['admin', 'moderator'],
        isActive: true,
      });

      expect(manager.isUserAllowedToUseTool('user1', 'test-tool', ['admin'])).toBe(true);
      expect(manager.isUserAllowedToUseTool('user2', 'test-tool', ['moderator'])).toBe(true);
      expect(manager.isUserAllowedToUseTool('user3', 'test-tool', ['user'])).toBe(false);
    });

    it('should allow access when guard is inactive', () => {
      manager.createGuard({
        name: 'Inactive Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['owner1'],
        allowedRoles: [],
        isActive: false,
      });

      // Should allow access even for non-owner when guard is inactive
      expect(manager.isUserAllowedToUseTool('anyone', 'test-tool')).toBe(true);
    });

    it('should allow access when no guard exists for tool', () => {
      expect(manager.isUserAllowedToUseTool('anyone', 'unguarded-tool')).toBe(true);
    });

    it('should handle multiple guards for same tool (any must pass)', () => {
      manager.createGuard({
        name: 'Guard 1',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      manager.createGuard({
        name: 'Guard 2',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'role_based',
        allowedUsers: [],
        allowedRoles: ['admin'],
        isActive: true,
      });

      // User1 should pass via first guard
      expect(manager.isUserAllowedToUseTool('user1', 'test-tool')).toBe(true);

      // Admin user should pass via second guard
      expect(manager.isUserAllowedToUseTool('admin-user', 'test-tool', ['admin'])).toBe(true);

      // Regular user should fail both
      expect(manager.isUserAllowedToUseTool('other', 'test-tool', ['user'])).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should save guards to file', async () => {
      manager.createGuard({
        name: 'Test Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      // Trigger save manually
      await (manager as any).saveToFile();

      // Check file exists
      const fileExists = await fs.access(testConfigPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should load guards from file', async () => {
      // Create and save a guard
      const created = manager.createGuard({
        name: 'Test Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });
      await (manager as any).saveToFile();

      // Clear in-memory guards and reload
      (manager as any).guards.clear();
      await (manager as any).loadFromFile();

      const loaded = manager.getGuardById(created.id);
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe('Test Guard');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty allowed users', () => {
      manager.createGuard({
        name: 'Empty Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: [],
        allowedRoles: [],
        isActive: true,
      });

      expect(manager.isUserAllowedToUseTool('anyone', 'test-tool')).toBe(false);
    });

    it('should handle null/undefined roles gracefully', () => {
      manager.createGuard({
        name: 'Role Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'role_based',
        allowedUsers: [],
        allowedRoles: ['admin'],
        isActive: true,
      });

      expect(manager.isUserAllowedToUseTool('user1', 'test-tool', undefined)).toBe(false);
      expect(manager.isUserAllowedToUseTool('user1', 'test-tool', [])).toBe(false);
    });

    it('should return false for non-existent guard ID operations', () => {
      expect(manager.deleteGuard('non-existent')).toBe(false);
      expect(manager.updateGuard('non-existent', { name: 'Updated' })).toBeUndefined();
      expect(manager.toggleGuard('non-existent')).toBeUndefined();
    });
  });
});
