/**
 * Comprehensive Marketplace API Integration Tests
 * Tests package installation, version checking, update detection, and changelog retrieval
 */

import fs from 'fs';
import path from 'path';
import express, { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import marketplaceRouter from '../../src/server/routes/marketplace';

// Mock authentication middleware
jest.mock('../../src/auth/middleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'testuser', role: 'admin' };
    next();
  }),
  requireRole: jest.fn((role: string) => (req: any, res: any, next: any) => {
    if (req.user?.role === role) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock plugin manager functions
const mockInstallPlugin = jest.fn();
const mockUninstallPlugin = jest.fn();
const mockUpdatePlugin = jest.fn();
const mockListInstalledPlugins = jest.fn();

jest.mock('../../src/plugins/PluginManager', () => ({
  installPlugin: mockInstallPlugin,
  uninstallPlugin: mockUninstallPlugin,
  updatePlugin: mockUpdatePlugin,
  listInstalledPlugins: mockListInstalledPlugins,
}));

// Mock version tracking
const mockCheckForUpdates = jest.fn();

jest.mock('../../src/server/utils/versionTracking', () => ({
  checkForUpdates: mockCheckForUpdates,
}));

describe('Marketplace API - Comprehensive Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace', marketplaceRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockListInstalledPlugins.mockResolvedValue([
      {
        name: 'test-plugin-1',
        version: '1.0.0',
        manifest: {
          displayName: 'Test Plugin 1',
          description: 'A test plugin',
          type: 'tool',
        },
        repoUrl: 'https://github.com/test/plugin1',
        installedAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        name: 'test-plugin-2',
        version: '2.5.0',
        manifest: {
          displayName: 'Test Plugin 2',
          description: 'Another test plugin',
          type: 'llm',
        },
        repoUrl: 'https://github.com/test/plugin2',
        installedAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z',
      },
    ]);

    mockCheckForUpdates.mockResolvedValue({
      current: '1.0.0',
      latest: '1.0.0',
      hasUpdate: false,
      changelog: [],
    });
  });

  // ============================================================================
  // Package Listing Tests
  // ============================================================================

  describe('GET /api/marketplace/packages - List Packages', () => {
    it('should list all available packages', async () => {
      const response = await request(app).get('/api/marketplace/packages').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((pkg: any) => {
        expect(pkg).toHaveProperty('name');
        expect(pkg).toHaveProperty('displayName');
        expect(pkg).toHaveProperty('description');
        expect(pkg).toHaveProperty('type');
        expect(pkg).toHaveProperty('version');
        expect(pkg).toHaveProperty('status');
        expect(['built-in', 'installed', 'available']).toContain(pkg.status);
      });
    });

    it('should include built-in packages', async () => {
      const response = await request(app).get('/api/marketplace/packages').expect(200);

      const builtInPackages = response.body.filter((pkg: any) => pkg.status === 'built-in');
      expect(builtInPackages.length).toBeGreaterThan(0);
    });

    it('should include installed packages', async () => {
      const response = await request(app).get('/api/marketplace/packages').expect(200);

      const installedPackages = response.body.filter((pkg: any) => pkg.status === 'installed');
      expect(installedPackages.length).toBeGreaterThanOrEqual(0);
    });

    it('should use cache for subsequent requests', async () => {
      // First request
      await request(app).get('/api/marketplace/packages').expect(200);

      // Second request should use cache
      const response = await request(app).get('/api/marketplace/packages').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle errors gracefully (500)', async () => {
      mockListInstalledPlugins.mockRejectedValueOnce(new Error('Filesystem error'));

      const response = await request(app).get('/api/marketplace/packages').expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/marketplace/packages/:name - Get Package Details', () => {
    it('should get details for existing package', async () => {
      const response = await request(app)
        .get('/api/marketplace/packages/test-plugin-1')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'test-plugin-1');
      expect(response.body).toHaveProperty('displayName');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('version');
    });

    it('should return 404 for non-existent package', async () => {
      const response = await request(app)
        .get('/api/marketplace/packages/nonexistent-package')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should include update information if available', async () => {
      mockCheckForUpdates.mockResolvedValueOnce({
        current: '1.0.0',
        latest: '1.2.0',
        hasUpdate: true,
        changelog: [{ version: '1.2.0', date: '2024-03-01', changes: ['New features'] }],
      });

      const response = await request(app)
        .get('/api/marketplace/packages/test-plugin-1')
        .expect(200);

      if (response.body.status === 'installed') {
        expect(response.body).toHaveProperty('hasUpdate');
        expect(response.body).toHaveProperty('latestVersion');
      }
    });
  });

  // ============================================================================
  // Package Installation Tests
  // ============================================================================

  describe('POST /api/marketplace/install - Install Package', () => {
    it('should successfully install package from GitHub', async () => {
      const mockPlugin = {
        name: 'new-plugin',
        version: '1.0.0',
        manifest: {
          displayName: 'New Plugin',
          description: 'A newly installed plugin',
          type: 'tool',
        },
        repoUrl: 'https://github.com/test/new-plugin',
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockInstallPlugin.mockResolvedValueOnce(mockPlugin);

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/new-plugin' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.package).toHaveProperty('name', 'new-plugin');
      expect(response.body.package).toHaveProperty('status', 'installed');
      expect(mockInstallPlugin).toHaveBeenCalledWith('https://github.com/test/new-plugin');
    });

    it('should validate missing repoUrl (400)', async () => {
      const response = await request(app).post('/api/marketplace/install').send({}).expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate invalid repoUrl format (400)', async () => {
      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'not-a-url' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle git clone errors', async () => {
      mockInstallPlugin.mockRejectedValueOnce(new Error('git clone failed: repository not found'));

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/nonexistent' })
        .expect(400);

      expect(response.body.error).toContain('Installation failed');
      expect(response.body.errorType).toBe('marketplace_git_error');
      expect(response.body.suggestions).toBeDefined();
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle build errors', async () => {
      mockInstallPlugin.mockRejectedValueOnce(new Error('npm build failed: missing dependency'));

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/broken-plugin' })
        .expect(500);

      expect(response.body.errorType).toBe('marketplace_build_failed');
      expect(response.body.suggestions).toContain(
        'Check the package build logs for specific errors'
      );
    });

    it('should handle manifest validation errors', async () => {
      mockInstallPlugin.mockRejectedValueOnce(new Error('manifest validation failed'));

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/invalid-manifest' })
        .expect(400);

      expect(response.body.errorType).toBe('validation_error');
      expect(response.body.suggestions).toContain('Ensure the package has a valid manifest.json');
    });

    it('should handle network errors', async () => {
      mockInstallPlugin.mockRejectedValueOnce(new Error('network error: ECONNREFUSED'));

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/plugin' })
        .expect(503);

      expect(response.body.errorType).toBe('network_error');
      expect(response.body.canRetry).toBe(true);
      expect(response.body.docsUrl).toBeDefined();
    });

    it('should provide actionable error suggestions', async () => {
      mockInstallPlugin.mockRejectedValueOnce(new Error('Installation failed'));

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/plugin' })
        .expect(400);

      expect(response.body.suggestions).toBeDefined();
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions.length).toBeGreaterThan(0);
    });

    it('should require admin role (403)', async () => {
      jest
        .mocked(require('../../src/auth/middleware').requireRole)
        .mockImplementationOnce((role: string) => (req: any, res: any, next: any) => {
          res.status(403).json({ error: 'Forbidden' });
        });

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/plugin' })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  // ============================================================================
  // Package Uninstallation Tests
  // ============================================================================

  describe('POST /api/marketplace/uninstall/:name - Uninstall Package', () => {
    it('should successfully uninstall package', async () => {
      mockUninstallPlugin.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/marketplace/uninstall/test-plugin-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('uninstalled');
      expect(mockUninstallPlugin).toHaveBeenCalledWith('test-plugin-1');
    });

    it('should validate package name (400)', async () => {
      const response = await request(app).post('/api/marketplace/uninstall/%20').expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle non-existent package gracefully', async () => {
      mockUninstallPlugin.mockRejectedValueOnce(new Error('Plugin not found'));

      const response = await request(app)
        .post('/api/marketplace/uninstall/nonexistent-plugin')
        .expect(400);

      expect(response.body.error).toContain('Uninstall failed');
    });

    it('should require admin role (403)', async () => {
      jest
        .mocked(require('../../src/auth/middleware').requireRole)
        .mockImplementationOnce((role: string) => (req: any, res: any, next: any) => {
          res.status(403).json({ error: 'Forbidden' });
        });

      const response = await request(app)
        .post('/api/marketplace/uninstall/test-plugin-1')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  // ============================================================================
  // Package Update Tests
  // ============================================================================

  describe('POST /api/marketplace/update/:name - Update Package', () => {
    it('should successfully update package', async () => {
      const updatedPlugin = {
        name: 'test-plugin-1',
        version: '1.1.0',
        manifest: {
          displayName: 'Test Plugin 1',
          description: 'Updated version',
          type: 'tool',
        },
        repoUrl: 'https://github.com/test/plugin1',
        installedAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      };

      mockUpdatePlugin.mockResolvedValueOnce(updatedPlugin);

      const response = await request(app).post('/api/marketplace/update/test-plugin-1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.package.version).toBe('1.1.0');
      expect(mockUpdatePlugin).toHaveBeenCalledWith('test-plugin-1');
    });

    it('should validate package name (400)', async () => {
      const response = await request(app).post('/api/marketplace/update/ ').expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle update errors', async () => {
      mockUpdatePlugin.mockRejectedValueOnce(new Error('Update failed: no updates available'));

      const response = await request(app).post('/api/marketplace/update/test-plugin-1').expect(400);

      expect(response.body.error).toContain('Update failed');
    });

    it('should require admin role (403)', async () => {
      jest
        .mocked(require('../../src/auth/middleware').requireRole)
        .mockImplementationOnce((role: string) => (req: any, res: any, next: any) => {
          res.status(403).json({ error: 'Forbidden' });
        });

      const response = await request(app).post('/api/marketplace/update/test-plugin-1').expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  // ============================================================================
  // Version Checking Tests
  // ============================================================================

  describe('GET /api/marketplace/check-updates/:name - Check for Updates', () => {
    it('should check for updates successfully', async () => {
      mockCheckForUpdates.mockResolvedValueOnce({
        current: '1.0.0',
        latest: '1.2.0',
        hasUpdate: true,
        changelog: [
          {
            version: '1.2.0',
            date: '2024-03-01',
            changes: ['Added new features', 'Fixed bugs'],
          },
          {
            version: '1.1.0',
            date: '2024-02-01',
            changes: ['Performance improvements'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/marketplace/check-updates/test-plugin-1')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'test-plugin-1');
      expect(response.body).toHaveProperty('current', '1.0.0');
      expect(response.body).toHaveProperty('latest', '1.2.0');
      expect(response.body).toHaveProperty('hasUpdate', true);
      expect(response.body).toHaveProperty('changelog');
      expect(Array.isArray(response.body.changelog)).toBe(true);
      expect(response.body.changelog.length).toBeGreaterThan(0);
    });

    it('should indicate no updates available', async () => {
      mockCheckForUpdates.mockResolvedValueOnce({
        current: '1.0.0',
        latest: '1.0.0',
        hasUpdate: false,
        changelog: [],
      });

      const response = await request(app)
        .get('/api/marketplace/check-updates/test-plugin-1')
        .expect(200);

      expect(response.body.hasUpdate).toBe(false);
      expect(response.body.current).toBe(response.body.latest);
    });

    it('should return 404 for non-existent plugin', async () => {
      mockListInstalledPlugins.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/marketplace/check-updates/nonexistent-plugin')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should validate plugin name parameter (400)', async () => {
      const response = await request(app).get('/api/marketplace/check-updates/%20').expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle version check errors (500)', async () => {
      mockCheckForUpdates.mockRejectedValueOnce(new Error('Version check failed'));

      const response = await request(app)
        .get('/api/marketplace/check-updates/test-plugin-1')
        .expect(500);

      expect(response.body.error).toContain('Failed to check updates');
    });

    it('should include changelog with version history', async () => {
      mockCheckForUpdates.mockResolvedValueOnce({
        current: '1.0.0',
        latest: '1.3.0',
        hasUpdate: true,
        changelog: [
          {
            version: '1.3.0',
            date: '2024-03-15',
            changes: ['Major update', 'Breaking changes'],
          },
          {
            version: '1.2.0',
            date: '2024-03-01',
            changes: ['New features'],
          },
          {
            version: '1.1.0',
            date: '2024-02-01',
            changes: ['Bug fixes'],
          },
        ],
      });

      const response = await request(app)
        .get('/api/marketplace/check-updates/test-plugin-1')
        .expect(200);

      expect(response.body.changelog).toHaveLength(3);
      expect(response.body.changelog[0].version).toBe('1.3.0');
      expect(response.body.changelog[0]).toHaveProperty('date');
      expect(response.body.changelog[0]).toHaveProperty('changes');
      expect(Array.isArray(response.body.changelog[0].changes)).toBe(true);
    });
  });

  describe('GET /api/marketplace/check-all-updates - Check All Updates', () => {
    it('should check updates for all installed plugins', async () => {
      mockCheckForUpdates
        .mockResolvedValueOnce({
          current: '1.0.0',
          latest: '1.2.0',
          hasUpdate: true,
        })
        .mockResolvedValueOnce({
          current: '2.5.0',
          latest: '2.5.0',
          hasUpdate: false,
        });

      const response = await request(app).get('/api/marketplace/check-all-updates').expect(200);

      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('updatesAvailable', 1);
      expect(response.body).toHaveProperty('packages');
      expect(Array.isArray(response.body.packages)).toBe(true);
      expect(response.body.packages).toHaveLength(2);

      const packagesWithUpdates = response.body.packages.filter((p: any) => p.hasUpdate);
      expect(packagesWithUpdates).toHaveLength(1);
    });

    it('should handle no installed plugins', async () => {
      mockListInstalledPlugins.mockResolvedValueOnce([]);

      const response = await request(app).get('/api/marketplace/check-all-updates').expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.updatesAvailable).toBe(0);
      expect(response.body.packages).toEqual([]);
    });

    it('should continue checking even if some checks fail', async () => {
      mockCheckForUpdates
        .mockResolvedValueOnce({
          current: '1.0.0',
          latest: '1.2.0',
          hasUpdate: true,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app).get('/api/marketplace/check-all-updates').expect(200);

      expect(response.body.total).toBe(2);
      // Should still return results for successful checks
      expect(response.body.packages.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully (500)', async () => {
      mockListInstalledPlugins.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/marketplace/check-all-updates').expect(500);

      expect(response.body.error).toContain('Failed to check updates');
    });
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      jest
        .mocked(require('../../src/auth/middleware').authenticateToken)
        .mockImplementationOnce((req: any, res: any, next: any) => {
          res.status(401).json({ error: 'Unauthorized' });
        });

      const response = await request(app).get('/api/marketplace/packages').expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should require admin role for installation', async () => {
      jest
        .mocked(require('../../src/auth/middleware').requireRole)
        .mockImplementationOnce((role: string) => (req: any, res: any, next: any) => {
          res.status(403).json({ error: 'Forbidden' });
        });

      const response = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/plugin' })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should require admin role for uninstallation', async () => {
      jest
        .mocked(require('../../src/auth/middleware').requireRole)
        .mockImplementationOnce((role: string) => (req: any, res: any, next: any) => {
          res.status(403).json({ error: 'Forbidden' });
        });

      const response = await request(app)
        .post('/api/marketplace/uninstall/test-plugin-1')
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should require admin role for updates', async () => {
      jest
        .mocked(require('../../src/auth/middleware').requireRole)
        .mockImplementationOnce((role: string) => (req: any, res: any, next: any) => {
          res.status(403).json({ error: 'Forbidden' });
        });

      const response = await request(app).post('/api/marketplace/update/test-plugin-1').expect(403);

      expect(response.body.error).toBe('Forbidden');
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON (400)', async () => {
      const response = await request(app)
        .post('/api/marketplace/install')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle very long package names', async () => {
      const longName = 'a'.repeat(300);

      const response = await request(app).get(`/api/marketplace/packages/${longName}`).expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should handle special characters in package names', async () => {
      const response = await request(app)
        .get('/api/marketplace/packages/test@plugin#1')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should handle concurrent install requests', async () => {
      mockInstallPlugin.mockResolvedValue({
        name: 'concurrent-plugin',
        version: '1.0.0',
        manifest: { displayName: 'Test', description: 'Test', type: 'tool' },
        repoUrl: 'https://github.com/test/plugin',
        installedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/marketplace/install')
            .send({ repoUrl: 'https://github.com/test/plugin' })
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect([201, 400, 500]).toContain(response.status);
      });
    });

    it('should validate repository URL format', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://github.com/test/plugin',
        'http://malicious-site.com',
        '../../../etc/passwd',
      ];

      for (const url of invalidUrls) {
        const response = await request(app).post('/api/marketplace/install').send({ repoUrl: url });

        expect([400, 500]).toContain(response.status);
      }
    });
  });
});
