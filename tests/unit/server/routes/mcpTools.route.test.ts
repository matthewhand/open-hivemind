/**
 * Tests for /api/mcp-tools list + test endpoints (MCPService-backed).
 */

import express from 'express';
import request from 'supertest';
import { MCPService } from '../../../../src/mcp/MCPService';
import mcpToolsRouter from '../../../../src/server/routes/mcpTools';

function buildApp() {
  const app = express();
  app.use('/api/mcp-tools', mcpToolsRouter);
  return app;
}

describe('/api/mcp-tools routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /list returns tools from MCPService registry', async () => {
    jest.spyOn(MCPService, 'getInstance').mockReturnValue({
      getAllTools: () => [
        {
          name: 'echo',
          description: 'Echo tool',
          inputSchema: { type: 'object' },
          serverName: 'demo',
        },
      ],
      getConnectedServers: () => ['demo'],
    } as unknown as MCPService);

    const res = await request(buildApp()).get('/api/mcp-tools/list').expect(200);

    expect(res.body.count).toBe(1);
    expect(res.body.tools).toHaveLength(1);
    expect(res.body.tools[0].name).toBe('echo');
    expect(res.body.servers).toEqual(['demo']);
  });

  it('GET /list returns empty when no servers connected', async () => {
    jest.spyOn(MCPService, 'getInstance').mockReturnValue({
      getAllTools: () => [],
      getConnectedServers: () => [],
    } as unknown as MCPService);

    const res = await request(buildApp()).get('/api/mcp-tools/list').expect(200);

    expect(res.body).toMatchObject({ tools: [], count: 0, servers: [] });
  });

  it('GET /test reports no_servers when disconnected', async () => {
    jest.spyOn(MCPService, 'getInstance').mockReturnValue({
      getAllTools: () => [],
      getConnectedServers: () => [],
    } as unknown as MCPService);

    const res = await request(buildApp()).get('/api/mcp-tools/test').expect(200);

    expect(res.body.status).toBe('no_servers');
    expect(res.body.connectedServers).toBe(0);
    expect(res.body.toolCount).toBe(0);
  });

  it('GET /test reports ok with connected servers', async () => {
    jest.spyOn(MCPService, 'getInstance').mockReturnValue({
      getAllTools: () => [{ name: 't', serverName: 's' }],
      getConnectedServers: () => ['s'],
    } as unknown as MCPService);

    const res = await request(buildApp()).get('/api/mcp-tools/test').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.connectedServers).toBe(1);
    expect(res.body.toolCount).toBe(1);
  });
});
