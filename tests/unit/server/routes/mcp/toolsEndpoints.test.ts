/**
 * Tests for the MCP tools page backend endpoints:
 *
 *   GET  /tools/preferences   — per-tool enable/disable map
 *   POST /tools/:id/toggle    — persist a tool enable/disable change
 *   POST /tools/history       — record a tool execution
 *   GET  /tools/history       — list recent executions (newest first)
 *
 * The WebUI (MCPToolsPage hooks) was already calling these routes but they
 * did not exist server-side — the calls were silently caught. These tests
 * pin the request/response shapes the client expects.
 *
 * The router (tools.ts) carries no auth middleware itself — auth lives in
 * mcp/index.ts — so we can mount it directly. Singleton getInstance() is
 * stubbed with temp-file-backed instances so the real data/ dir is untouched.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import toolsRouter from '@src/server/routes/mcp/tools';
import { MCPToolHistoryService } from '@src/server/services/MCPToolHistoryService';
import { ToolPreferencesService } from '@src/server/services/ToolPreferencesService';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', toolsRouter);
  return app;
}

describe('MCP tools endpoints', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mcp-tools-routes-'));
    jest
      .spyOn(ToolPreferencesService, 'getInstance')
      .mockReturnValue(
        ToolPreferencesService.createForTesting(path.join(tmpDir, 'tool-preferences.json'))
      );
    jest
      .spyOn(MCPToolHistoryService, 'getInstance')
      .mockReturnValue(
        MCPToolHistoryService.createForTesting(path.join(tmpDir, 'mcp-tool-history.json'))
      );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  describe('GET /tools/preferences', () => {
    it('returns an empty preferences map initially', async () => {
      const res = await request(buildApp()).get('/tools/preferences');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({});
    });

    it('reflects a toggle: data is keyed by toolId with an enabled flag', async () => {
      const app = buildApp();
      await request(app)
        .post('/tools/srv-echo/toggle')
        .send({ enabled: false, serverName: 'srv', toolName: 'echo' });

      const res = await request(app).get('/tools/preferences');

      expect(res.status).toBe(200);
      // Shape the client relies on: prefsJson.data[toolId].enabled
      expect(res.body.data['srv-echo']).toMatchObject({
        toolId: 'srv-echo',
        serverName: 'srv',
        toolName: 'echo',
        enabled: false,
      });
    });
  });

  describe('POST /tools/:id/toggle', () => {
    it('persists the preference and returns it', async () => {
      const res = await request(buildApp())
        .post('/tools/srv-echo/toggle')
        .send({ enabled: true, serverName: 'srv', toolName: 'echo' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ toolId: 'srv-echo', enabled: true });
    });

    it('rejects a missing enabled flag with 400', async () => {
      const res = await request(buildApp())
        .post('/tools/srv-echo/toggle')
        .send({ serverName: 'srv', toolName: 'echo' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MCP_TOOL_TOGGLE_INVALID');
    });

    it('rejects missing serverName/toolName with 400', async () => {
      const res = await request(buildApp()).post('/tools/srv-echo/toggle').send({ enabled: true });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MCP_TOOL_TOGGLE_INVALID');
    });
  });

  describe('POST + GET /tools/history', () => {
    it('records an execution and lists it back newest first', async () => {
      const app = buildApp();

      const post = await request(app)
        .post('/tools/history')
        .send({
          id: 'rec-1',
          serverName: 'srv',
          toolName: 'echo',
          arguments: { q: 'hello' },
          result: { ok: true },
          status: 'success',
          executedAt: '2026-01-01T00:00:00.000Z',
          duration: 12,
        });
      expect(post.status).toBe(201);
      expect(post.body.data).toMatchObject({ id: 'rec-1', toolName: 'echo' });

      await request(app)
        .post('/tools/history')
        .send({ serverName: 'srv', toolName: 'later', status: 'error', error: 'boom' });

      const res = await request(app).get('/tools/history?limit=50');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].toolName).toBe('later');
      expect(res.body.data[0].status).toBe('error');
      expect(res.body.data[1].id).toBe('rec-1');
    });

    it('honours the limit query parameter', async () => {
      const app = buildApp();
      for (const tool of ['a', 'b', 'c']) {
        await request(app).post('/tools/history').send({ serverName: 'srv', toolName: tool });
      }

      const res = await request(app).get('/tools/history?limit=1');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].toolName).toBe('c');
    });

    it('rejects a record without serverName/toolName with 400', async () => {
      const res = await request(buildApp()).post('/tools/history').send({ arguments: {} });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MCP_TOOL_HISTORY_INVALID');
    });
  });
});
