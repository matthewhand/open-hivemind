import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { ToolUsageGuardsManager } from '@src/managers/ToolUsageGuardsManager';

describe('ToolUsageGuardsManager', () => {
  let manager: ToolUsageGuardsManager;
  const testConfigPath = path.join(__dirname, '../../../config/user/test-tool-usage-guards.json');

  beforeEach(async () => {
    manager = ToolUsageGuardsManager.getInstance();
    (manager as any).guardsFilePath = testConfigPath;
    (manager as any).guards.clear();
  });

  afterEach(async () => {
    // Clean up test files
    try {
      fs.unlinkSync(testConfigPath);
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

      const retrieved = manager.getGuard(created.id);
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
        toolId: 'test-tool',
        guardType: 'owner_only',
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
      expect(manager.getGuard(created.id)).toBeUndefined();
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

      const toggled = manager.toggleGuard(created.id, false);
      expect(toggled?.isActive).toBe(false);

      const toggledAgain = manager.toggleGuard(created.id, true);
      expect(toggledAgain?.isActive).toBe(true);
    });
  });

  describe('Access Control', () => {
    it('should allow access for owner_only guard type', async () => {
      manager.createGuard({
        name: 'Owner Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['owner1', 'owner2'],
        allowedRoles: [],
        isActive: true,
      });

      expect((await manager.isUserAllowedToUseTool('owner1', 'test-tool')).allowed).toBe(true);
      expect((await manager.isUserAllowedToUseTool('owner2', 'test-tool')).allowed).toBe(true);
      expect((await manager.isUserAllowedToUseTool('other-user', 'test-tool')).allowed).toBe(false);
    });

    it('should allow access for user_list guard type', async () => {
      manager.createGuard({
        name: 'User List Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'user_list',
        allowedUsers: ['user1', 'user2'],
        allowedRoles: [],
        isActive: true,
      });

      expect((await manager.isUserAllowedToUseTool('user1', 'test-tool')).allowed).toBe(true);
      expect((await manager.isUserAllowedToUseTool('user3', 'test-tool')).allowed).toBe(false);
    });

    it('should allow access for role_based guard type', async () => {
      manager.createGuard({
        name: 'Role Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'role_based',
        allowedUsers: [],
        allowedRoles: ['admin', 'moderator'],
        isActive: true,
      });

      expect((await manager.isUserAllowedToUseTool('user1', 'test-tool', ['admin'])).allowed).toBe(true);
      expect((await manager.isUserAllowedToUseTool('user2', 'test-tool', ['moderator'])).allowed).toBe(true);
      expect((await manager.isUserAllowedToUseTool('user3', 'test-tool', ['user'])).allowed).toBe(false);
    });

    it('should allow access when guard is inactive', async () => {
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
      expect((await manager.isUserAllowedToUseTool('anyone', 'test-tool')).allowed).toBe(true);
    });

    it('should allow access when no guard exists for tool', async () => {
      expect((await manager.isUserAllowedToUseTool('anyone', 'unguarded-tool')).allowed).toBe(true);
    });

    it('should handle multiple guards for same tool (any must pass)', async () => {
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
      expect((await manager.isUserAllowedToUseTool('user1', 'test-tool')).allowed).toBe(true);

      // Admin user should pass via second guard
      expect((await manager.isUserAllowedToUseTool('admin-user', 'test-tool', ['admin'])).allowed).toBe(true);

      // Regular user should fail both
      expect((await manager.isUserAllowedToUseTool('other', 'test-tool', ['user'])).allowed).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should save guards to file on create', () => {
      manager.createGuard({
        name: 'Test Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      // createGuard calls saveGuards internally, so file should exist
      const fileExists = fs.existsSync(testConfigPath);
      expect(fileExists).toBe(true);
    });

    it('should reload guards from file', () => {
      // Create and save a guard (saveGuards is called by createGuard)
      const created = manager.createGuard({
        name: 'Test Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: ['user1'],
        allowedRoles: [],
        isActive: true,
      });

      // Clear in-memory guards and reload
      (manager as any).guards.clear();
      (manager as any).loadGuards();

      const loaded = manager.getGuard(created.id);
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe('Test Guard');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty allowed users', async () => {
      manager.createGuard({
        name: 'Empty Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'owner_only',
        allowedUsers: [],
        allowedRoles: [],
        isActive: true,
      });

      expect((await manager.isUserAllowedToUseTool('anyone', 'test-tool')).allowed).toBe(false);
    });

    it('should handle undefined roles gracefully', async () => {
      manager.createGuard({
        name: 'Role Guard',
        description: 'Test',
        toolId: 'test-tool',
        guardType: 'role_based',
        allowedUsers: [],
        allowedRoles: ['admin'],
        isActive: true,
      });

      expect((await manager.isUserAllowedToUseTool('user1', 'test-tool', undefined)).allowed).toBe(false);
      expect((await manager.isUserAllowedToUseTool('user1', 'test-tool', [])).allowed).toBe(false);
    });

    it('should return false for non-existent guard ID delete', () => {
      expect(manager.deleteGuard('non-existent')).toBe(false);
    });

    it('should throw for non-existent guard ID update', () => {
      expect(() => manager.updateGuard('non-existent', {
        name: 'Updated',
        toolId: 'test-tool',
        guardType: 'owner_only',
      })).toThrow();
    });

    it('should throw for non-existent guard ID toggle', () => {
      expect(() => manager.toggleGuard('non-existent', false)).toThrow();
    });
  });
});
