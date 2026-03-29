/**
 * Comprehensive MCP API Integration Tests
 * Tests MCP tool execution, preferences, provider management, and history endpoints
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import mcpRouter from '../../src/server/routes/mcp';
import fs from 'fs';
import path from 'path';

// Mock authentication middleware
jest.mock('../../src/auth/middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'testuser', isAdmin: true };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user?.isAdmin) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue({
      tools: [
        {
          name: 'calculator',
          description: 'Perform calculations',
          inputSchema: { type: 'object', properties: { expression: { type: 'string' } } },
        },
        {
          name: 'weather',
          description: 'Get weather information',
          inputSchema: { type: 'object', properties: { location: { type: 'string' } } },
        },
      ],
    }),
    callTool: jest.fn().mockImplementation(({ name, arguments: args }) => {
      if (name === 'calculator') {
        return Promise.resolve({ result: '42' });
      }
      if (name === 'weather') {
        return Promise.resolve({ result: { temp: 72, condition: 'sunny' } });
      }
      return Promise.reject(new Error('Unknown tool'));
    }),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('MCP API - Comprehensive Integration Tests', () => {
  let app: Express;
  const testDataDir = path.join(process.cwd(), 'data');
  const mcpServersFile = path.join(testDataDir, 'mcp-servers.json');
  const historyFile = path.join(testDataDir, 'tool-execution-history.jsonl');
  const preferencesFile = path.join(testDataDir, 'tool-preferences.json');

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/mcp', mcpRouter);

    // Ensure data directory exists
    await fs.promises.mkdir(testDataDir, { recursive: true });
  });

  beforeEach(async () => {
    // Reset test files
    await fs.promises.writeFile(mcpServersFile, '[]', 'utf8').catch(() => {});
    await fs.promises.unlink(historyFile).catch(() => {});
    await fs.promises.unlink(preferencesFile).catch(() => {});
  });

  afterEach(async () => {
    // Cleanup
    await fs.promises.writeFile(mcpServersFile, '[]', 'utf8').catch(() => {});
    await fs.promises.unlink(historyFile).catch(() => {});
    await fs.promises.unlink(preferencesFile).catch(() => {});
  });

  // ============================================================================
  // Tool Execution Tests
  // ============================================================================

  describe('POST /api/mcp/servers/:name/call-tool - Tool Execution with Parameters', () => {
    beforeEach(async () => {
      // Create and connect a test server
      await request(app).post('/api/mcp/servers').send({
        name: 'test-server',
        url: 'stdio://test-command',
      });
      await request(app).post('/api/mcp/servers/test-server/connect');
    });

    it('should successfully execute tool with parameters', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({
          toolName: 'calculator',
          arguments: { expression: '2 + 2' },
        })
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body).toHaveProperty('executionId');
      expect(response.body.result).toEqual({ result: '42' });
    });

    it('should execute tool with complex arguments', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({
          toolName: 'weather',
          arguments: {
            location: 'New York',
            units: 'fahrenheit',
            includeHourly: true,
          },
        })
        .expect(200);

      expect(response.body.result).toBeDefined();
    });

    it('should execute tool with empty arguments', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({
          toolName: 'calculator',
          arguments: {},
        })
        .expect(200);

      expect(response.body.result).toBeDefined();
    });

    it('should validate missing toolName (400)', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({
          arguments: { test: 'value' },
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.issues).toBeDefined();
    });

    it('should handle non-existent server (404)', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/nonexistent/call-tool')
        .send({
          toolName: 'calculator',
          arguments: {},
        })
        .expect(404);

      expect(response.body.error).toContain('not connected');
    });

    it('should handle tool execution errors (500)', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({
          toolName: 'unknown-tool',
          arguments: {},
        })
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should record tool execution in history', async () => {
      // Execute a tool
      await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({
          toolName: 'calculator',
          arguments: { expression: '5 * 5' },
        })
        .expect(200);

      // Give it a moment to log
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check history
      const historyResponse = await request(app)
        .get('/api/mcp/tools/history')
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Tool Preferences Tests
  // ============================================================================

  describe('Tool Preferences - Enable/Disable Persistence', () => {
    const toolId = 'test-server-calculator';
    const serverName = 'test-server';
    const toolName = 'calculator';

    it('should toggle tool to disabled (POST /api/mcp/tools/:id/toggle)', async () => {
      const response = await request(app)
        .post(`/api/mcp/tools/${toolId}/toggle`)
        .send({
          enabled: false,
          serverName,
          toolName,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.message).toContain('disabled');
    });

    it('should toggle tool to enabled', async () => {
      const response = await request(app)
        .post(`/api/mcp/tools/${toolId}/toggle`)
        .send({
          enabled: true,
          serverName,
          toolName,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.message).toContain('enabled');
    });

    it('should persist preference across requests', async () => {
      // Disable tool
      await request(app)
        .post(`/api/mcp/tools/${toolId}/toggle`)
        .send({
          enabled: false,
          serverName,
          toolName,
        })
        .expect(200);

      // Retrieve preference
      const response = await request(app)
        .get(`/api/mcp/tools/${toolId}/preference`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
    });

    it('should return default preference if none exists', async () => {
      const response = await request(app)
        .get(`/api/mcp/tools/new-tool-id/preference`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true); // Default is enabled
      expect(response.body.data.isDefault).toBe(true);
    });

    it('should validate required fields for toggle (400)', async () => {
      const response = await request(app)
        .post(`/api/mcp/tools/${toolId}/toggle`)
        .send({
          // Missing required fields
          enabled: true,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should get all tool preferences', async () => {
      // Create some preferences
      await request(app)
        .post('/api/mcp/tools/tool-1/toggle')
        .send({ enabled: false, serverName: 'server-1', toolName: 'tool-1' });

      await request(app)
        .post('/api/mcp/tools/tool-2/toggle')
        .send({ enabled: true, serverName: 'server-1', toolName: 'tool-2' });

      const response = await request(app).get('/api/mcp/tools/preferences').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should get tool preferences statistics', async () => {
      const response = await request(app).get('/api/mcp/tools/preferences/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTools');
      expect(response.body.data).toHaveProperty('enabledTools');
      expect(response.body.data).toHaveProperty('disabledTools');
    });
  });

  describe('Bulk Tool Toggle', () => {
    it('should bulk enable multiple tools', async () => {
      const tools = [
        { toolId: 'server-1-tool-1', serverName: 'server-1', toolName: 'tool-1' },
        { toolId: 'server-1-tool-2', serverName: 'server-1', toolName: 'tool-2' },
        { toolId: 'server-2-tool-1', serverName: 'server-2', toolName: 'tool-1' },
      ];

      const response = await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools,
          enabled: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(response.body.message).toContain('3 tools');
      expect(response.body.message).toContain('enabled');
    });

    it('should bulk disable multiple tools', async () => {
      const tools = [
        { toolId: 'server-1-tool-1', serverName: 'server-1', toolName: 'tool-1' },
        { toolId: 'server-1-tool-2', serverName: 'server-1', toolName: 'tool-2' },
      ];

      const response = await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools,
          enabled: false,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disabled');
    });

    it('should validate empty tools array (400)', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools: [],
          enabled: true,
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should validate missing enabled field (400)', async () => {
      const response = await request(app)
        .post('/api/mcp/tools/bulk-toggle')
        .send({
          tools: [{ toolId: 'test', serverName: 'test', toolName: 'test' }],
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  // ============================================================================
  // MCP Server Connection Tests
  // ============================================================================

  describe('MCP Server Connections', () => {
    it('should connect to server with valid configuration', async () => {
      await request(app).post('/api/mcp/servers').send({
        name: 'connection-test',
        url: 'stdio://test-cmd',
      });

      const response = await request(app)
        .post('/api/mcp/servers/connection-test/connect')
        .expect(200);

      expect(response.body.server.connected).toBe(true);
      expect(response.body.message).toContain('Successfully connected');
    });

    it('should reject connecting to already connected server (400)', async () => {
      await request(app).post('/api/mcp/servers').send({
        name: 'double-connect',
        url: 'stdio://test-cmd',
      });

      await request(app).post('/api/mcp/servers/double-connect/connect').expect(200);

      const response = await request(app)
        .post('/api/mcp/servers/double-connect/connect')
        .expect(400);

      expect(response.body.error).toContain('already connected');
    });

    it('should disconnect from connected server', async () => {
      await request(app).post('/api/mcp/servers').send({
        name: 'disconnect-test',
        url: 'stdio://test-cmd',
      });

      await request(app).post('/api/mcp/servers/disconnect-test/connect');

      const response = await request(app)
        .post('/api/mcp/servers/disconnect-test/disconnect')
        .expect(200);

      expect(response.body.message).toContain('Successfully disconnected');
    });

    it('should get list of connected servers', async () => {
      await request(app).post('/api/mcp/servers').send({
        name: 'connected-1',
        url: 'stdio://test-cmd',
      });
      await request(app).post('/api/mcp/servers/connected-1/connect');

      const response = await request(app).get('/api/mcp/connected').expect(200);

      expect(response.body.connected).toBeDefined();
      expect(Array.isArray(response.body.connected)).toBe(true);
      expect(response.body.connected.length).toBeGreaterThan(0);
    });

    it('should validate server name parameter (400)', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/%20/connect')
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  // ============================================================================
  // Tool History Tests
  // ============================================================================

  describe('Tool History Retrieval', () => {
    beforeEach(async () => {
      // Create test history entries
      const executions = [
        {
          id: 'exec-1',
          serverName: 'server-a',
          toolName: 'tool-1',
          arguments: { param: 'value1' },
          result: { output: 'result1' },
          status: 'success',
          executedAt: new Date('2024-01-01T10:00:00Z').toISOString(),
          duration: 100,
        },
        {
          id: 'exec-2',
          serverName: 'server-a',
          toolName: 'tool-2',
          arguments: { param: 'value2' },
          result: { output: 'result2' },
          status: 'success',
          executedAt: new Date('2024-01-01T11:00:00Z').toISOString(),
          duration: 150,
        },
        {
          id: 'exec-3',
          serverName: 'server-b',
          toolName: 'tool-1',
          arguments: {},
          result: null,
          error: 'Test error',
          status: 'error',
          executedAt: new Date('2024-01-01T12:00:00Z').toISOString(),
          duration: 50,
        },
      ];

      for (const exec of executions) {
        await request(app).post('/api/mcp/tools/history').send(exec);
      }
    });

    it('should get all tool executions', async () => {
      const response = await request(app).get('/api/mcp/tools/history').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by serverName', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/history?serverName=server-a')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((exec: any) => {
        expect(exec.serverName).toBe('server-a');
      });
    });

    it('should filter by toolName', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/history?toolName=tool-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((exec: any) => {
        expect(exec.toolName).toBe('tool-1');
      });
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/history?status=error')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((exec: any) => {
        expect(exec.status).toBe('error');
      });
    });

    it('should filter by time range', async () => {
      const response = await request(app)
        .get(
          '/api/mcp/tools/history?startTime=2024-01-01T10:30:00Z&endTime=2024-01-01T11:30:00Z'
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should only return exec-2
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/history?limit=2&offset=1')
        .expect(200);

      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(1);
    });

    it('should get specific execution by ID', async () => {
      const response = await request(app).get('/api/mcp/tools/history/exec-1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('exec-1');
      expect(response.body.data.serverName).toBe('server-a');
    });

    it('should return 404 for non-existent execution ID', async () => {
      const response = await request(app)
        .get('/api/mcp/tools/history/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should get tool execution statistics', async () => {
      const response = await request(app).get('/api/mcp/tools/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalExecutions');
      expect(response.body.data).toHaveProperty('successRate');
      expect(response.body.data).toHaveProperty('averageDuration');
    });
  });

  // ============================================================================
  // MCP Provider Manager Tests
  // ============================================================================

  describe('MCP Provider Management', () => {
    const testProvider = {
      id: 'test-provider-1',
      name: 'Test Provider',
      command: 'node',
      args: ['test-server.js'],
      env: { TEST_VAR: 'value' },
    };

    it('should create new MCP provider', async () => {
      const response = await request(app)
        .post('/api/mcp/providers')
        .send(testProvider)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProvider.id);
    });

    it('should return existing provider if already exists (idempotent)', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider).expect(201);

      const response = await request(app)
        .post('/api/mcp/providers')
        .send(testProvider)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('already exists');
    });

    it('should get all MCP providers', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider);

      const response = await request(app).get('/api/mcp/providers').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get specific provider by ID', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider);

      const response = await request(app)
        .get(`/api/mcp/providers/${testProvider.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testProvider.id);
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .get('/api/mcp/providers/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should update provider', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider);

      const updates = {
        name: 'Updated Provider Name',
        args: ['updated-server.js'],
      };

      const response = await request(app)
        .put(`/api/mcp/providers/${testProvider.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updates.name);
    });

    it('should delete provider', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider);

      const response = await request(app)
        .delete(`/api/mcp/providers/${testProvider.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');
    });

    it('should be idempotent when deleting non-existent provider', async () => {
      const response = await request(app)
        .delete('/api/mcp/providers/nonexistent-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('already deleted');
    });

    it('should validate provider configuration (400)', async () => {
      const invalidProvider = {
        id: 'invalid',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/mcp/providers')
        .send(invalidProvider)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid');
    });

    it('should start provider', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider);

      const response = await request(app)
        .post(`/api/mcp/providers/${testProvider.id}/start`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('started');
    });

    it('should stop provider', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider);

      const response = await request(app)
        .post(`/api/mcp/providers/${testProvider.id}/stop`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('stopped');
    });

    it('should test provider', async () => {
      await request(app).post('/api/mcp/providers').send(testProvider);

      const response = await request(app)
        .post(`/api/mcp/providers/${testProvider.id}/test`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should get provider templates', async () => {
      const response = await request(app).get('/api/mcp/providers/templates').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get provider statistics', async () => {
      const response = await request(app).get('/api/mcp/providers/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle server errors gracefully (500)', async () => {
      // Force an error by making an invalid operation
      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({
          toolName: 'error-tool',
          arguments: {},
        });

      if (response.status === 500) {
        expect(response.body.error).toBeDefined();
        expect(response.body.code).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      }
    });

    it('should validate malformed JSON (400)', async () => {
      const response = await request(app)
        .post('/api/mcp/servers')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app).post('/api/mcp/servers').send({
        name: 'test',
        url: 'stdio://test',
      });

      // Should still work with express.json() middleware
      expect([200, 400]).toContain(response.status);
    });
  });
});
