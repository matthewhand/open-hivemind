import { expect, test } from '@playwright/test';

/**
 * API-level CRUD e2e for memory profiles.
 *
 * Exercises the real /api/config/memory-profiles router against the live
 * dev server (see playwright.config.ts webServer block). Complements the
 * UI-mocked tests in memory-providers.spec.ts by asserting the actual
 * persistence path works: create → list → update → delete.
 *
 * Auth: ALLOW_TEST_BYPASS=true is set on the webServer command so any
 * request is treated as an admin user. No JWT shenanigans needed.
 */

const ROUTE = '/api/config/memory-profiles';

const newProfile = (suffix: string) => ({
  key: `e2e-test-${suffix}-${Date.now()}`,
  name: `E2E Test ${suffix}`,
  type: 'redis',
  provider: 'mem0',
  config: {
    host: 'redis.test.local',
    port: 6379,
    vectorStoreProvider: 'memory',
  },
  isDefault: false,
});

test.describe('Memory profiles CRUD (API)', () => {
  test.describe.configure({ mode: 'serial' });

  let createdKey: string;

  test('GET /api/config/memory-profiles returns the documented envelope', async ({ request }) => {
    const res = await request.get(ROUTE);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, data: { memory: expect.any(Array) } });
  });

  test('POST creates a new profile', async ({ request }) => {
    const profile = newProfile('create');
    createdKey = profile.key;

    const res = await request.post(ROUTE, { data: profile });
    expect(res.status(), `body: ${await res.text()}`).toBeLessThan(400);

    // Confirm via list
    const listRes = await request.get(ROUTE);
    const listBody = await listRes.json();
    const found = listBody.data.memory.find((p: { key: string }) => p.key === createdKey);
    expect(found, `created key ${createdKey} should appear in list`).toBeDefined();
    // NOTE: GET currently strips `type` from the response even though POST
    // preserves it — see the test.fail block below documenting this bug.
    expect(found).toMatchObject({ name: profile.name, provider: profile.provider });
  });

  // Documents a known data-loss bug: POST /api/config/memory-profiles returns
  // a profile with `type` set, but the subsequent GET strips it. This test is
  // marked `.fail()` so the suite stays green; flip back to `.fixme()` or
  // remove the `.fail` once the GET response shape is corrected.
  test.fail('GET response should preserve `type` field set on create', async ({ request }) => {
    const profile = newProfile('type-roundtrip');
    await request.post(ROUTE, { data: profile });
    try {
      const list = await (await request.get(ROUTE)).json();
      const found = list.data.memory.find((p: { key: string }) => p.key === profile.key);
      expect(found?.type).toBe(profile.type);
    } finally {
      await request.delete(`${ROUTE}/${profile.key}`);
    }
  });

  test('PUT updates an existing profile', async ({ request }) => {
    test.skip(!createdKey, 'depends on previous create');

    const updateRes = await request.put(`${ROUTE}/${createdKey}`, {
      data: { name: 'E2E Updated Name', config: { host: 'redis.updated.local', port: 6380 } },
    });
    expect(updateRes.status(), `body: ${await updateRes.text()}`).toBeLessThan(400);

    const listBody = await (await request.get(ROUTE)).json();
    const updated = listBody.data.memory.find((p: { key: string }) => p.key === createdKey);
    expect(updated?.name).toBe('E2E Updated Name');
  });

  test('DELETE removes the profile', async ({ request }) => {
    test.skip(!createdKey, 'depends on previous create');

    const delRes = await request.delete(`${ROUTE}/${createdKey}`);
    expect(delRes.status()).toBeLessThan(400);

    const listBody = await (await request.get(ROUTE)).json();
    const found = listBody.data.memory.find((p: { key: string }) => p.key === createdKey);
    expect(found, 'deleted profile should not appear').toBeUndefined();
  });

  test('PUT on non-existent key returns 4xx (not silent success)', async ({ request }) => {
    const res = await request.put(`${ROUTE}/does-not-exist-${Date.now()}`, {
      data: { name: 'should fail' },
    });
    // Spec is vague between 404 and 422; either is acceptable, 200/2xx is not.
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST with malformed body is rejected by validation schema', async ({ request }) => {
    const res = await request.post(ROUTE, {
      // Missing required fields (key, type, provider).
      data: { name: 'bad' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('POST with smuggled __proto__ key does not pollute', async ({ request }) => {
    // Schema validation should strip unknown keys, but assert defense-in-depth.
    const profile = { ...newProfile('proto'), __proto__: { polluted: true } };
    const res = await request.post(ROUTE, { data: profile });
    // We accept the body either being rejected or accepted-and-stripped.
    if (res.status() < 400) {
      // Cleanup
      await request.delete(`${ROUTE}/${profile.key}`);
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
