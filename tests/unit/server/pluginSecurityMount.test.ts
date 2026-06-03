/**
 * Regression test for audit (plugin-security-mount).
 *
 * The PluginSecurity dashboard (src/client/src/pages/PluginSecurityPage.tsx)
 * calls GET /api/admin/plugins/security and POST /api/admin/plugins/:name/verify
 * and /trust. The router in src/server/routes/pluginSecurity.ts defines those
 * routes (and documents them at /api/admin/plugins/... in its OpenAPI comments),
 * but registerRoutes() previously mounted it at /api/pluginSecurity, so every
 * dashboard request 404'd.
 *
 * These tests assert the router is reachable under /api/admin/plugins so the
 * mount path matches what the page (and the OpenAPI docs) expect.
 */
import express from 'express';
import request from 'supertest';
import { registerRoutes } from '@src/server/registerRoutes';

const buildApp = (): express.Application => {
  const app = express();
  app.use(express.json());
  registerRoutes(app, {
    frontendDistPath: '/tmp/does-not-exist',
    viteServerRef: { current: undefined },
  });
  return app;
};

describe('PluginSecurity router mount path (registerRoutes)', () => {
  const ORIGINAL_ALLOW_IPS = process.env.HTTP_ALLOW_ALL_IPS;

  beforeAll(() => {
    // Avoid IP-whitelist 403s masking the routing behaviour we are testing.
    process.env.HTTP_ALLOW_ALL_IPS = 'true';
  });

  afterAll(() => {
    if (ORIGINAL_ALLOW_IPS === undefined) delete process.env.HTTP_ALLOW_ALL_IPS;
    else process.env.HTTP_ALLOW_ALL_IPS = ORIGINAL_ALLOW_IPS;
  });

  it('serves GET /api/admin/plugins/security (not 404)', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/admin/plugins/security');

    // The route must be reachable. In test env the router skips auth and returns
    // the security-status payload; the key assertion is it is NOT a 404 from a
    // missing mount.
    expect(res.status).not.toBe(404);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(Array.isArray(res.body.data?.plugins)).toBe(true);
  });

  it('routes POST /api/admin/plugins/:name/trust to the trust handler', async () => {
    const app = buildApp();
    const agent = request.agent(app);

    // Acquire a CSRF token so the state-changing POST is not rejected by the
    // CSRF gate before it can reach the routing layer.
    const tokenRes = await agent.get('/api/csrf-token');
    const token: string = tokenRes.body.csrfToken;

    const res = await agent
      .post('/api/admin/plugins/__nonexistent-plugin__/trust')
      .set('X-CSRF-Token', token)
      .send({ trust: false });

    // Reaching the handler for an unknown plugin yields a 404 from the handler
    // body (`Plugin not found in security policy`), NOT an Express routing 404
    // with an empty body. This proves the path is routed to pluginSecurity.ts
    // rather than the old /api/pluginSecurity mount where it was unrouted.
    expect(res.status).toBe(404);
    expect(res.body?.error).toBe('Plugin not found');
  });

  it('no longer serves the legacy /api/pluginSecurity mount', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/pluginSecurity/security');

    // The legacy prefix should be gone; the catch-all /api openapiRouter handles
    // it, so it must not return the security payload.
    expect(res.body?.data?.plugins).toBeUndefined();
  });
});
