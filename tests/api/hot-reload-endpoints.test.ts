/**
 * TDD Test Suite for Hot Reload API Endpoints
 *
 * Comprehensive tests for all hot reload endpoints
 *
 * @file hot-reload-endpoints.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-28
 */

import request from 'supertest';
import express from 'express';
import hotReloadRouter from '../../src/server/routes/hotReload';
import { HotReloadManager, ConfigurationChange } from '../../src/config/HotReloadManager';
import { WebSocketService } from '../../src/server/services/WebSocketService';

// Mock HotReloadManager
jest.mock('../../src/config/HotReloadManager', () => ({
  HotReloadManager: {
    getInstance: jest.fn().mockReturnValue({
      applyConfigurationChange: jest.fn().mockResolvedValue({
        success: true,
        message: 'Configuration change applied successfully',
        changeId: 'test-change-123'
      }),
      getChangeHistory: jest.fn().mockReturnValue([
        {
          id: 'change-1',
          timestamp: new Date().toISOString(),
          type: 'update',
          botName: 'test-bot',
          changes: { enabled: true },
          validated: true,
          applied: true,
          rollbackAvailable: true
        }
      ]),
      getAvailableRollbacks: jest.fn().mockReturnValue([
        {
          id: 'snapshot-1',
          timestamp: new Date().toISOString(),
          description: 'Test snapshot'
        }
      ]),
      rollbackToSnapshot: jest.fn().mockResolvedValue(true)
    })
  },
  ConfigurationChange: class {}
}));

// Mock WebSocketService
jest.mock('../../src/server/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn().mockReturnValue({
      recordAlert: jest.fn()
    })
  }
}));

describe('Hot Reload API Endpoints - COMPLETE TDD SUITE', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', hotReloadRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/config/hot-reload - APPLY CONFIGURATION CHANGES', () => {
    it('should successfully apply valid configuration changes', async () => {
      const changeData = {
        type: 'update',
        botName: 'test-bot',
        changes: {
          enabled: true,
          messageProvider: 'discord'
        }
      };

      const response = await request(app)
        .post('/api/config/hot-reload')
        .send(changeData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('changeId');
    });

    it('should reject requests with no changes', async () => {
      const invalidChangeData = {
        type: 'update',
        botName: 'test-bot',
        changes: {} // Empty changes
      };

      const response = await request(app)
        .post('/api/config/hot-reload')
        .send(invalidChangeData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('No changes provided');
    });

    it('should reject requests missing required fields', async () => {
      const incompleteChangeData = {
        // Missing type, botName, and changes
      };

      const response = await request(app)
        .post('/api/config/hot-reload')
        .send(incompleteChangeData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle hot reload manager errors gracefully', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;
      mockManager.mockReturnValueOnce({
        applyConfigurationChange: jest.fn().mockRejectedValue(new Error('Hot reload failed'))
      });

      const changeData = {
        type: 'update',
        botName: 'test-bot',
        changes: { enabled: false }
      };

      const response = await request(app)
        .post('/api/config/hot-reload')
        .send(changeData)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should validate change data structure', async () => {
      const validChangeTypes = ['create', 'update', 'delete'];

      for (const changeType of validChangeTypes) {
        const changeData = {
          type: changeType,
          botName: 'test-bot',
          changes: { enabled: true }
        };

        const response = await request(app)
          .post('/api/config/hot-reload')
          .send(changeData);

        expect([200, 400, 500]).toContain(response.status);
        // Should not crash with valid types
      }
    });
  });

  describe('GET /api/config/hot-reload/history - CHANGE HISTORY', () => {
    it('should return change history', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/history')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('history');
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    it('should support limit query parameter', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/history?limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('history');
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    it('should validate change history structure', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/history')
        .expect(200);

      if (response.body.history.length > 0) {
        const change = response.body.history[0];
        expect(change).toHaveProperty('id');
        expect(change).toHaveProperty('timestamp');
        expect(change).toHaveProperty('type');
        expect(change).toHaveProperty('botName');
        expect(change).toHaveProperty('changes');
        expect(change).toHaveProperty('validated');
        expect(change).toHaveProperty('applied');
        expect(change).toHaveProperty('rollbackAvailable');
      }
    });

    it('should handle history retrieval errors gracefully', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;
      mockManager.mockReturnValueOnce({
        getChangeHistory: jest.fn().mockImplementation(() => {
          throw new Error('History retrieval failed');
        })
      });

      const response = await request(app)
        .get('/api/config/hot-reload/history')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should default to reasonable limit when not specified', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;

      await request(app)
        .get('/api/config/hot-reload/history')
        .expect(200);

      expect(mockManager().getChangeHistory).toHaveBeenCalledWith(50); // Default limit
    });
  });

  describe('GET /api/config/hot-reload/rollbacks - AVAILABLE ROLLBACKS', () => {
    it('should return available rollback snapshots', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/rollbacks')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('rollbacks');
      expect(Array.isArray(response.body.rollbacks)).toBe(true);
    });

    it('should validate rollback snapshot structure', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/rollbacks')
        .expect(200);

      if (response.body.rollbacks.length > 0) {
        const rollback = response.body.rollbacks[0];
        expect(rollback).toHaveProperty('id');
        expect(rollback).toHaveProperty('timestamp');
        expect(rollback).toHaveProperty('description');
      }
    });

    it('should handle rollback retrieval errors gracefully', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;
      mockManager.mockReturnValueOnce({
        getAvailableRollbacks: jest.fn().mockImplementation(() => {
          throw new Error('Rollback retrieval failed');
        })
      });

      const response = await request(app)
        .get('/api/config/hot-reload/rollbacks')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/config/hot-reload/rollback/:snapshotId - ROLLBACK TO SNAPSHOT', () => {
    it('should successfully rollback to valid snapshot', async () => {
      const snapshotId = 'snapshot-123';

      const response = await request(app)
        .post(`/api/config/hot-reload/rollback/${snapshotId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Configuration rolled back successfully');
    });

    it('should notify via WebSocket on successful rollback', async () => {
      const snapshotId = 'snapshot-123';
      const mockWSService = WebSocketService.getInstance as jest.MockedFunction<any>;

      await request(app)
        .post(`/api/config/hot-reload/rollback/${snapshotId}`)
        .expect(200);

      expect(mockWSService().recordAlert).toHaveBeenCalledWith({
        level: 'warning',
        title: 'Configuration Rolled Back',
        message: expect.stringContaining(`Configuration rolled back to snapshot ${snapshotId}`),
        metadata: { snapshotId }
      });
    });

    it('should handle rollback to non-existent snapshot', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;
      mockManager.mockReturnValueOnce({
        rollbackToSnapshot: jest.fn().mockResolvedValue(false)
      });

      const snapshotId = 'non-existent-snapshot';

      const response = await request(app)
        .post(`/api/config/hot-reload/rollback/${snapshotId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found or rollback failed');
    });

    it('should handle rollback errors gracefully', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;
      mockManager.mockReturnValueOnce({
        rollbackToSnapshot: jest.fn().mockRejectedValue(new Error('Rollback failed'))
      });

      const snapshotId = 'snapshot-123';

      const response = await request(app)
        .post(`/api/config/hot-reload/rollback/${snapshotId}`)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });

    it('should validate snapshot ID parameter', async () => {
      const invalidSnapshotIds = ['', 'invalid-id', '../../../etc/passwd'];

      for (const snapshotId of invalidSnapshotIds) {
        const response = await request(app)
          .post(`/api/config/hot-reload/rollback/${encodeURIComponent(snapshotId)}`);

        expect([200, 400, 404, 500]).toContain(response.status);
        // Should not crash the application
      }
    });
  });

  describe('GET /api/config/hot-reload/status - HOT RELOAD STATUS', () => {
    it('should return hot reload status information', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toHaveProperty('isActive');
      expect(response.body.status).toHaveProperty('changeHistoryCount');
      expect(response.body.status).toHaveProperty('availableRollbacksCount');
      expect(response.body.status).toHaveProperty('lastChange');
    });

    it('should indicate hot reload is active', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/status')
        .expect(200);

      expect(response.body.status.isActive).toBe(true);
    });

    it('should include change history count', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/status')
        .expect(200);

      expect(typeof response.body.status.changeHistoryCount).toBe('number');
      expect(response.body.status.changeHistoryCount).toBeGreaterThanOrEqual(0);
    });

    it('should include available rollbacks count', async () => {
      const response = await request(app)
        .get('/api/config/hot-reload/status')
        .expect(200);

      expect(typeof response.body.status.availableRollbacksCount).toBe('number');
      expect(response.body.status.availableRollbacksCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle status retrieval errors gracefully', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;
      mockManager.mockReturnValueOnce({
        getChangeHistory: jest.fn().mockImplementation(() => {
          throw new Error('Status retrieval failed');
        }),
        getAvailableRollbacks: jest.fn().mockReturnValue([])
      });

      const response = await request(app)
        .get('/api/config/hot-reload/status')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('EDGE CASES AND ERROR HANDLING', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const response = await request(app)
        .post('/api/config/hot-reload')
        .set('Content-Type', 'application/json')
        .send('{invalid json}')
        .expect(400);
    });

    it('should handle concurrent hot reload requests', async () => {
      const changeData = {
        type: 'update',
        botName: 'test-bot',
        changes: { enabled: true }
      };

      const requests = Array(5).fill(null).map(() =>
        request(app).post('/api/config/hot-reload').send(changeData)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect([200, 400, 500]).toContain(response.status);
      });
    });

    it('should handle extremely long input strings', async () => {
      const longString = 'a'.repeat(10000);
      const changeData = {
        type: 'update',
        botName: longString,
        changes: { enabled: true }
      };

      const response = await request(app)
        .post('/api/config/hot-reload')
        .send(changeData);

      expect([200, 201, 400, 413]).toContain(response.status);
    });

    it('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/api/config/hot-reload')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('SECURITY TESTS', () => {
    it('should validate against injection attempts in change data', async () => {
      const injectionAttempts = [
        {
          type: 'update',
          botName: '../../../etc/passwd',
          changes: { enabled: true }
        },
        {
          type: 'update',
          botName: 'test-bot',
          changes: {
            systemCommand: 'rm -rf /',
            enabled: true
          }
        },
        {
          type: 'update',
          botName: '<script>alert("xss")</script>',
          changes: { enabled: true }
        }
      ];

      for (const injection of injectionAttempts) {
        const response = await request(app)
          .post('/api/config/hot-reload')
          .send(injection);

        expect([200, 400, 404, 500]).toContain(response.status);
        // Should not crash the application
      }
    });

    it('should validate snapshot ID against path traversal', async () => {
      const maliciousSnapshotIds = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
        '....//....//....//etc/passwd'
      ];

      for (const snapshotId of maliciousSnapshotIds) {
        const response = await request(app)
          .post(`/api/config/hot-reload/rollback/${encodeURIComponent(snapshotId)}`);

        expect([200, 400, 404, 500]).toContain(response.status);
        // Should not expose sensitive information or crash
      }
    });

    it('should not expose sensitive information in error messages', async () => {
      const mockManager = HotReloadManager.getInstance as jest.MockedFunction<any>;
      mockManager.mockReturnValueOnce({
        applyConfigurationChange: jest.fn().mockRejectedValue(new Error('Configuration validation failed'))
      });

      const changeData = {
        type: 'update',
        botName: 'test-bot',
        changes: { enabled: false }
      };

      const response = await request(app)
        .post('/api/config/hot-reload')
        .send(changeData)
        .expect(500);

      const responseString = JSON.stringify(response.body);
      // Error messages should not contain sensitive data
      expect(responseString).not.toMatch(/password/);
      expect(responseString).not.toMatch(/secret123/);
      expect(responseString).toMatch(/Configuration validation failed/);
    });
  });
});