/**
 * Security regression test for mcp-admin-guard-enforcement.
 *
 * The admin `/api/mcp/servers/:name/call-tool` route executed
 * `client.callTool()` directly with NO guard parity to the LLM tool path. Tools
 * an operator flagged as sensitive (`mcpGuard.sensitiveTools`) require
 * human-in-the-loop approval and must not be invokable via this unattended
 * admin route.
 *
 * These tests assert:
 *  - a NON-sensitive tool is still executed (no admin lockout — conservative);
 *  - a tool flagged sensitive by any enabled bot guard is refused with 403;
 *  - the guard helper aggregates sensitive tools only from enabled guards.
 *
 * The router (servers.ts) carries no auth middleware itself — auth lives in
 * mcp/index.ts — so we can mount it directly and focus on the guard behavior.
 */

import express from 'express';
import request from 'supertest';
import serversRouter from '@src/server/routes/mcp/servers';
import {
  connectedClients,
  getGuardedSensitiveTools,
  type MCPClient,
} from '@src/server/routes/mcp/shared';
import { BotConfigurationManager } from '@config/BotConfigurationManager';

type GetAllBots = ReturnType<typeof BotConfigurationManager.getInstance>['getAllBots'];

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', serversRouter);
  return app;
}

function injectFakeClient(serverName: string, callTool: jest.Mock): void {
  const fakeClient = {
    client: { callTool },
  } as unknown as MCPClient;
  connectedClients.set(serverName, fakeClient);
}

function mockBots(bots: unknown[]): jest.SpyInstance {
  return jest
    .spyOn(BotConfigurationManager, 'getInstance')
    .mockReturnValue({ getAllBots: (() => bots) as GetAllBots } as ReturnType<
      typeof BotConfigurationManager.getInstance
    >);
}

describe('MCP admin call-tool guard enforcement', () => {
  const serverName = 'test-server';

  afterEach(() => {
    connectedClients.delete(serverName);
    jest.restoreAllMocks();
  });

  it('executes a non-sensitive tool (no admin lockout)', async () => {
    const callTool = jest.fn().mockResolvedValue({ content: 'ok', isError: false });
    injectFakeClient(serverName, callTool);
    mockBots([{ mcpGuard: { enabled: true, type: 'owner', sensitiveTools: ['danger'] } }]);

    const res = await request(buildApp())
      .post(`/servers/${serverName}/call-tool`)
      .send({ toolName: 'safe-tool', arguments: { q: 'hello' } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(callTool).toHaveBeenCalledWith({ name: 'safe-tool', arguments: { q: 'hello' } });
  });

  it('refuses a sensitive tool with 403 and never calls the client', async () => {
    const callTool = jest.fn().mockResolvedValue({ content: 'ok', isError: false });
    injectFakeClient(serverName, callTool);
    mockBots([{ mcpGuard: { enabled: true, type: 'owner', sensitiveTools: ['danger'] } }]);

    const res = await request(buildApp())
      .post(`/servers/${serverName}/call-tool`)
      .send({ toolName: 'danger', arguments: {} });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MCP_TOOL_SENSITIVE');
    expect(callTool).not.toHaveBeenCalled();
  });

  it('ignores sensitiveTools from a disabled guard', () => {
    mockBots([
      { mcpGuard: { enabled: false, type: 'owner', sensitiveTools: ['danger'] } },
      { mcpGuard: { enabled: true, type: 'custom', sensitiveTools: ['live'] } },
      { mcpGuard: undefined },
    ]);

    const sensitive = getGuardedSensitiveTools();
    expect(sensitive.has('live')).toBe(true);
    expect(sensitive.has('danger')).toBe(false);
  });
});
