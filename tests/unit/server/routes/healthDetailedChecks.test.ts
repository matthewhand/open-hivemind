/**
 * Tests for the real subsystem `checks` block on GET /detailed.
 *
 * Previously the checks.database / configuration / services fields were
 * hardcoded to { status: 'healthy' }. They now probe live singletons
 * (DatabaseManager, BotConfigurationManager, ProviderRegistry) via the
 * buildSystemChecks helper. These tests drive those singletons directly and
 * assert the endpoint reflects their real state.
 */

import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { buildSystemChecks } from '../../../../src/server/routes/health/helpers';
import { ProviderRegistry } from '../../../../src/registries/ProviderRegistry';
import detailedRouter from '../../../../src/server/routes/health/detailed';

// Mount the router behind a middleware that injects an authenticated user so
// the full (non-sanitized) detailed payload — including `checks` — is returned.
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { user?: unknown }).user = { id: 'test-user', role: 'admin' };
    next();
  });
  app.use('/', detailedRouter);
  return app;
}

function registerStubLlmProvider(id: string) {
  ProviderRegistry.getInstance().register({
    id,
    name: id,
    type: 'llm',
  } as any);
}

describe('buildSystemChecks()', () => {
  it('returns a status for each subsystem with a descriptive detail', () => {
    const checks = buildSystemChecks();

    for (const key of ['database', 'configuration', 'services'] as const) {
      expect(checks[key]).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(checks[key].status);
      expect(typeof checks[key].detail).toBe('string');
      expect(checks[key].detail.length).toBeGreaterThan(0);
    }
  });

  it('reports the database check based on DatabaseManager.isConnected()', () => {
    const { DatabaseManager } = require('../../../../src/database/DatabaseManager');
    const connected = DatabaseManager.getInstance().isConnected();
    const checks = buildSystemChecks();

    expect(checks.database.status).toBe(connected ? 'healthy' : 'unhealthy');
  });

  it('marks services healthy once a provider is registered', () => {
    registerStubLlmProvider('health-test-llm-provider');

    const checks = buildSystemChecks();

    expect(checks.services.status).toBe('healthy');
    expect(checks.services.detail).toMatch(/llm provider/);
  });
});

describe('GET /detailed checks block', () => {
  it('returns the real checks object for authenticated callers', async () => {
    registerStubLlmProvider('health-route-llm-provider');

    const res = await request(buildApp()).get('/detailed').expect(200);

    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database).toEqual(
      expect.objectContaining({ status: expect.any(String), detail: expect.any(String) })
    );
    expect(res.body.checks.configuration).toEqual(
      expect.objectContaining({ status: expect.any(String), detail: expect.any(String) })
    );
    expect(res.body.checks.services).toEqual(
      expect.objectContaining({ status: 'healthy', detail: expect.any(String) })
    );
    // Guard against regression to the old hardcoded shape (no `detail` field).
    expect(res.body.checks.database).toHaveProperty('detail');
  });
});
