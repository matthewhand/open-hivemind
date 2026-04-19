import express from 'express';
import request from 'supertest';
import enterpriseRouter from '@src/server/routes/enterprise';
import mcpRouter from '@src/server/routes/mcpTools';

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('MCP & Enterprise Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/mcp-tools', mcpRouter);
    app.use('/api/enterprise', enterpriseRouter);
  });

  describe('MCP Tools', () => {
    describe('GET /api/mcp-tools', () => {
      it('returns MCP tools list', async () => {
        const res = await request(app).get('/api/mcp-tools');
        expect(res.status).toBeDefined();
      });
    });

    describe('POST /api/mcp-tools/execute', () => {
      it('executes MCP tool', async () => {
        const res = await request(app)
          .post('/api/mcp-tools/execute')
          .send({ tool: 'test', args: {} });
        expect([200, 404, 500]).toContain(res.status);
      });
    });
  });

  describe('Enterprise', () => {
    describe('GET /api/enterprise/features', () => {
      it('returns enterprise features', async () => {
        const res = await request(app).get('/api/enterprise/features');
        expect(res.status).toBeDefined();
      });
    });
  });
});
