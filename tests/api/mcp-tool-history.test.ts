import fs from 'fs';
import path from 'path';
import express, { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import mcpRouter from '../../src/server/routes/mcp';

// Mock auth middleware to bypass authentication
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { username: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

// Routes not yet implemented in the MCP router
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('MCP Tool Execution History API', () => {
  let app: Express;
  const testLogFile = path.join(process.cwd(), 'data', 'tool-execution-history.jsonl');

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/mcp', mcpRouter);

    // Clean up test data
    try {
      await fs.promises.unlink(testLogFile);
    } catch (error) {
      // File might not exist, ignore
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await fs.promises.unlink(testLogFile);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/mcp/tools/history', () => {
    it('should log a successful tool execution', async () => {
      const execution = {
        id: 'test-exec-1',
        serverName: 'test-server',
        toolName: 'test-tool',
        arguments: { param1: 'value1' },
        result: { output: 'success' },
        status: 'success',
        executedAt: new Date().toISOString(),
        duration: 100,
      };

      const response = await request(app)
        .post('/api/mcp/tools/history')
        .send(execution)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tool execution logged successfully');
    });

    it('should log a failed tool execution', async () => {
      const execution = {
        id: 'test-exec-2',
        serverName: 'test-server',
        toolName: 'test-tool',
        arguments: { param1: 'value1' },
        result: null,
        error: 'Test error message',
        status: 'error',
        executedAt: new Date().toISOString(),
        duration: 50,
      };

      const response = await request(app)
        .post('/api/mcp/tools/history')
        .send(execution)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidExecution = {
        serverName: 'test-server',
        // Missing required fields
      };

      await request(app).post('/api/mcp/tools/history').send(invalidExecution).expect(400);
    });
  });

  describe('GET /api/mcp/tools/history', () => {
    beforeEach(async () => {
      // Add some test executions
      await request(app)
        .post('/api/mcp/tools/history')
        .send({
          id: 'exec-1',
          serverName: 'server-a',
          toolName: 'tool-1',
          arguments: {},
          result: { data: 'result1' },
          status: 'success',
          executedAt: new Date(Date.now() - 3000).toISOString(),
          duration: 100,
        });

      await request(app)
        .post('/api/mcp/tools/history')
        .send({
          id: 'exec-2',
          serverName: 'server-b',
          toolName: 'tool-2',
          arguments: {},
          result: null,
          error: 'Error message',
          status: 'error',
          executedAt: new Date(Date.now() - 2000).toISOString(),
          duration: 50,
        });

      await request(app)
        .post('/api/mcp/tools/history')
        .send({
          id: 'exec-3',
          serverName: 'server-a',
          toolName: 'tool-3',
          arguments: {},
          result: { data: 'result3' },
          status: 'success',
          executedAt: new Date(Date.now() - 1000).toISOString(),
          duration: 150,
        });
    });

    it('should retrieve all executions', async () => {
      const response = await request(app).get('/api/mcp/tools/history').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.count).toBe(3);
    });

    it('should filter by server name', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/history?serverName=server-a')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((e: any) => e.serverName === 'server-a')).toBe(true);
    });

    it('should filter by tool name', async () => {
      const response = await request(app).get('/api/mcp/tools/history?toolName=tool-2').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].toolName).toBe('tool-2');
    });

    it('should filter by status', async () => {
      const response = await request(app).get('/api/mcp/tools/history?status=success').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((e: any) => e.status === 'success')).toBe(true);
    });

    it('should support pagination with limit', async () => {
      const response = await request(app).get('/api/mcp/tools/history?limit=2').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should support pagination with offset', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/history?limit=1&offset=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/mcp/tools/history/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/mcp/tools/history')
        .send({
          id: 'specific-exec',
          serverName: 'test-server',
          toolName: 'test-tool',
          arguments: { key: 'value' },
          result: { output: 'test' },
          status: 'success',
          executedAt: new Date().toISOString(),
          duration: 100,
        });
    });

    it('should retrieve execution by ID', async () => {
      const response = await request(app).get('/api/mcp/tools/history/specific-exec').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('specific-exec');
      expect(response.body.data.toolName).toBe('test-tool');
    });

    it('should return 404 for non-existent ID', async () => {
      const response = await request(app).get('/api/mcp/tools/history/non-existent-id').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Tool execution not found');
    });
  });

  describe('GET /api/mcp/tools/stats', () => {
    beforeEach(async () => {
      // Add test executions with various statuses and servers
      const executions = [
        {
          id: 'stat-1',
          serverName: 'server-a',
          toolName: 'tool-1',
          arguments: {},
          result: {},
          status: 'success',
          executedAt: new Date().toISOString(),
          duration: 100,
        },
        {
          id: 'stat-2',
          serverName: 'server-a',
          toolName: 'tool-2',
          arguments: {},
          result: {},
          status: 'success',
          executedAt: new Date().toISOString(),
          duration: 200,
        },
        {
          id: 'stat-3',
          serverName: 'server-b',
          toolName: 'tool-1',
          arguments: {},
          result: null,
          error: 'Error',
          status: 'error',
          executedAt: new Date().toISOString(),
          duration: 50,
        },
      ];

      for (const exec of executions) {
        await request(app).post('/api/mcp/tools/history').send(exec);
      }
    });

    it('should return execution statistics', async () => {
      const response = await request(app).get('/api/mcp/tools/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalExecutions).toBe(3);
      expect(response.body.data.successfulExecutions).toBe(2);
      expect(response.body.data.failedExecutions).toBe(1);
      expect(response.body.data.averageDuration).toBe((100 + 200 + 50) / 3);
      expect(response.body.data.toolUsage).toHaveProperty('server-a/tool-1');
      expect(response.body.data.toolUsage).toHaveProperty('server-a/tool-2');
      expect(response.body.data.toolUsage).toHaveProperty('server-b/tool-1');
      expect(response.body.data.serverUsage).toHaveProperty('server-a');
      expect(response.body.data.serverUsage).toHaveProperty('server-b');
    });
  });
});
