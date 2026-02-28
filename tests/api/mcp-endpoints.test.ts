import { promises as fs } from 'fs';
import { join } from 'path';
import express, { Express } from 'express';
import request from 'supertest';
import { authenticate, requireAdmin } from '../../src/auth/middleware';
import { requireRole } from '../../src/server/middleware/auth';
import mcpRouter from '../../src/server/routes/mcp';

jest.mock('../../src/server/middleware/auth', () => ({
  requireRole: jest.fn((role) => (req: any, res: any, next: any) => {
    if (!req.user) {
      req.user = { id: 'test-user', username: 'test-user', isAdmin: true, role: 'admin' };
    }
    if (req.user?.role === role || req.user?.isAdmin) {
      next();
    } else {
      res.status(403).send('Forbidden');
    }
  }),
}));

jest.mock('../../src/auth/middleware', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user', username: 'test-user', isAdmin: true, role: 'admin' };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user?.isAdmin) {
      next();
    } else {
      res.status(403).send('Forbidden');
    }
  }),
}));

// Mock the MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue({
      tools: [
        {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    }),
    callTool: jest.fn().mockResolvedValue({ result: 'test result' }),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn().mockImplementation(() => ({
    // Mock transport implementation
  })),
}));

const MCP_SERVERS_CONFIG_FILE = join(process.cwd(), 'data', 'mcp-servers.json');

describe('MCP API Endpoints', () => {
  let app: Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/mcp', mcpRouter);

    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(MCP_SERVERS_CONFIG_FILE, '[]', 'utf8');
    } catch (error) {
      console.error('Error setting up test files:', error);
    }
  });

  afterEach(async () => {
    // Clear mock function calls after each test
    (authenticate as jest.Mock).mockClear();
    (requireAdmin as jest.Mock).mockClear();
    (requireRole as jest.Mock).mockClear();
    // Clean up created files
    try {
      await fs.writeFile(MCP_SERVERS_CONFIG_FILE, '[]', 'utf8');
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });

  describe('GET /api/mcp/servers', () => {
    it('should return an empty list of MCP servers', async () => {
      const response = await request(app).get('/api/mcp/servers');
      expect(response.status).toBe(200);
      expect(response.body.servers).toEqual([]);
    });
  });

  describe('POST /api/mcp/servers', () => {
    it('should create a new MCP server', async () => {
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
        apiKey: 'test-key',
      };
      const response = await request(app).post('/api/mcp/servers').send(newServer);
      expect(response.status).toBe(200);
      expect(response.body.server).toHaveProperty('name', 'test-server');
      expect(response.body.server.connected).toBe(false);
    });

    it('should reject duplicate server names', async () => {
      // First, create a server
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
      };
      await request(app).post('/api/mcp/servers').send(newServer);

      // Try to create another with the same name
      const response = await request(app).post('/api/mcp/servers').send(newServer);
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/mcp/servers/:name/connect', () => {
    it('should connect to an MCP server', async () => {
      // First, create a server
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
      };
      await request(app).post('/api/mcp/servers').send(newServer);

      // Now connect to it
      const response = await request(app).post('/api/mcp/servers/test-server/connect');
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Successfully connected');
    });

    it('should reject connection to non-existent server', async () => {
      const response = await request(app).post('/api/mcp/servers/non-existent/connect');
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/mcp/servers/:name/disconnect', () => {
    it('should disconnect from an MCP server', async () => {
      // First, create and connect to a server
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
      };
      await request(app).post('/api/mcp/servers').send(newServer);
      await request(app).post('/api/mcp/servers/test-server/connect');

      // Now disconnect
      const response = await request(app).post('/api/mcp/servers/test-server/disconnect');
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Successfully disconnected');
    });
  });

  describe('DELETE /api/mcp/servers/:name', () => {
    it('should remove an MCP server', async () => {
      // First, create a server
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
      };
      await request(app).post('/api/mcp/servers').send(newServer);

      // Now delete it
      const response = await request(app).delete('/api/mcp/servers/test-server');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify it's gone
      const getResponse = await request(app).get('/api/mcp/servers');
      expect(getResponse.body.servers.find((s: any) => s.name === 'test-server')).toBeUndefined();
    });
  });

  describe('GET /api/mcp/servers/:name/tools', () => {
    it('should get tools from a connected MCP server', async () => {
      // First, create and connect to a server
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
      };
      await request(app).post('/api/mcp/servers').send(newServer);
      await request(app).post('/api/mcp/servers/test-server/connect');

      // Now get tools
      const response = await request(app).get('/api/mcp/servers/test-server/tools');
      expect(response.status).toBe(200);
      expect(response.body.tools).toBeInstanceOf(Array);
      expect(response.body.tools.length).toBeGreaterThan(0);
    });

    it('should reject getting tools from disconnected server', async () => {
      const response = await request(app).get('/api/mcp/servers/disconnected-server/tools');
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not connected');
    });
  });

  describe('GET /api/mcp/connected', () => {
    it('should return connected MCP servers', async () => {
      const response = await request(app).get('/api/mcp/connected');
      expect(response.status).toBe(200);
      expect(response.body.connected).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/mcp/servers/:name/call-tool', () => {
    it('should call a tool on a connected MCP server', async () => {
      // First, create and connect to a server
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
      };
      await request(app).post('/api/mcp/servers').send(newServer);
      await request(app).post('/api/mcp/servers/test-server/connect');

      // Now call a tool
      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({ toolName: 'test-tool', arguments: {} });
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
    });

    it('should reject calling a tool on a disconnected server', async () => {
      const response = await request(app)
        .post('/api/mcp/servers/disconnected-server/call-tool')
        .send({ toolName: 'test-tool', arguments: {} });
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not connected');
    });

    it('should reject calling a tool without a tool name', async () => {
      // First, create and connect to a server
      const newServer = {
        name: 'test-server',
        url: 'stdio://test-command',
      };
      await request(app).post('/api/mcp/servers').send(newServer);
      await request(app).post('/api/mcp/servers/test-server/connect');

      const response = await request(app)
        .post('/api/mcp/servers/test-server/call-tool')
        .send({ arguments: {} });
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Tool name is required');
    });
  });
});
