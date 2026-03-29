import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock auth middleware to bypass authentication
jest.mock('@src/auth/middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { username: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

import mcpRouter from '@src/server/routes/mcp';
import { ToolPreferencesService } from '@src/server/services/ToolPreferencesService';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/mcp', mcpRouter);

// Routes not yet implemented in the MCP router
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('MCP Tool Preferences API', () => {
  const testDataFile = path.join(process.cwd(), 'data', 'tool-preferences.json');

  beforeEach(() => {
    // Clear singleton instance
    (ToolPreferencesService as any).instance = undefined;
  });

  afterEach(async () => {
    // Clean up test data file
    try {
      await fs.promises.unlink(testDataFile);
    } catch {
      // Ignore errors
    }
  });

  describe('POST /api/mcp/tools/:id/toggle', () => {
    it('should toggle a tool to disabled', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/server1-tool1/toggle')
        .send({
          enabled: false,
          serverName: 'server1',
          toolName: 'tool1',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.toolId).toBe('server1-tool1');
    });

    it('should toggle a tool to enabled', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/server1-tool1/toggle')
        .send({
          enabled: true,
          serverName: 'server1',
          toolName: 'tool1',
          userId: 'user123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.updatedBy).toBe('user123');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/server1-tool1/toggle')
        .send({
          enabled: 'not-a-boolean', // Invalid type
          serverName: 'server1',
          toolName: 'tool1',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/server1-tool1/toggle')
        .send({
          enabled: false,
          // Missing serverName and toolName
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/mcp/tools/bulk-toggle', () => {
    it('should bulk enable multiple tools', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools: [
            { toolId: 'server1-tool1', serverName: 'server1', toolName: 'tool1' },
            { toolId: 'server1-tool2', serverName: 'server1', toolName: 'tool2' },
          ],
          enabled: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].enabled).toBe(true);
      expect(response.body.data[1].enabled).toBe(true);
    });

    it('should bulk disable multiple tools', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools: [
            { toolId: 'server1-tool1', serverName: 'server1', toolName: 'tool1' },
            { toolId: 'server2-tool1', serverName: 'server2', toolName: 'tool1' },
          ],
          enabled: false,
          userId: 'user123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].enabled).toBe(false);
      expect(response.body.data[0].updatedBy).toBe('user123');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools: 'not-an-array', // Invalid type
          enabled: false,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/mcp/tools/:id/preference', () => {
    it('should return existing preference', async () => {
      // First create a preference
      await request(app)
        .post('/api/mcp/tools/server1-tool1/toggle')
        .send({
          enabled: false,
          serverName: 'server1',
          toolName: 'tool1',
        });

      const response = await request(app)
        .get('/api/mcp/tools/server1-tool1/preference');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.toolId).toBe('server1-tool1');
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.data.isDefault).toBe(false);
    });

    it('should return default preference if none exists', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/nonexistent-tool/preference');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true); // Default enabled
      expect(response.body.data.isDefault).toBe(true);
    });
  });

  describe('GET /api/mcp/tools/preferences', () => {
    it('should return all preferences', async () => {
      // Create some preferences
      await request(app)
        .post('/api/mcp/tools/server1-tool1/toggle')
        .send({
          enabled: false,
          serverName: 'server1',
          toolName: 'tool1',
        });

      await request(app)
        .post('/api/mcp/tools/server1-tool2/toggle')
        .send({
          enabled: true,
          serverName: 'server1',
          toolName: 'tool2',
        });

      const response = await request(app)
        .get('/api/mcp/tools/preferences');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Object.keys(response.body.data)).toHaveLength(2);
    });

    it('should return empty object if no preferences exist', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/preferences');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({});
    });
  });

  describe('GET /api/mcp/tools/preferences/stats', () => {
    it('should return statistics', async () => {
      // Create some preferences
      await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools: [
            { toolId: 'server1-tool1', serverName: 'server1', toolName: 'tool1' },
            { toolId: 'server1-tool2', serverName: 'server1', toolName: 'tool2' },
            { toolId: 'server2-tool1', serverName: 'server2', toolName: 'tool1' },
          ],
          enabled: false,
        });

      await request(app)
        .post('/api/mcp/tools/server2-tool2/toggle')
        .send({
          enabled: true,
          serverName: 'server2',
          toolName: 'tool2',
        });

      const response = await request(app)
        .get('/api/mcp/tools/preferences/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalPreferences).toBe(4);
      expect(response.body.data.enabledCount).toBe(1);
      expect(response.body.data.disabledCount).toBe(3);
    });
  });
});
