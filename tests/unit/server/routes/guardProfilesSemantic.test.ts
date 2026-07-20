/**
 * Unit tests for semantic-guard CRUD passthrough in the guard-profiles routes.
 *
 * Regression coverage: the POST / sanitizer only rebuilt mcpGuard, rateLimit
 * and contentFilter, silently dropping semanticInputGuard/semanticOutputGuard
 * on create; and the PUT /:id merge seeded its accumulator with `{}`, so any
 * guard section omitted from the request body (the common case when the UI
 * only edits the basic guards) was dropped from the stored profile on every
 * edit. These tests assert semantic guard fields now round-trip through
 * create, update, and bulk toggle.
 */

import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '@src/middleware/errorHandler';
// Import the router AFTER the mocks are registered.
import guardProfilesRouter from '@src/server/routes/guardProfiles';

// --- Mock the profile store so routes use a controllable in-memory copy ----
const loadGuardrailProfiles = jest.fn();
const saveGuardrailProfiles = jest.fn();

jest.mock('@src/config/guardrailProfiles', () => ({
  loadGuardrailProfiles: (...args: unknown[]) => loadGuardrailProfiles(...args),
  saveGuardrailProfiles: (...args: unknown[]) => saveGuardrailProfiles(...args),
}));

jest.mock('@src/config/guardSettings', () => ({
  loadGuardSettings: jest.fn(() => ({
    defaultRateLimit: { maxRequests: 100, windowMs: 60000 },
    defaultContentFilterStrictness: 'low',
    evaluationOrder: 'sequential',
  })),
  saveGuardSettings: jest.fn((settings: unknown) => settings),
}));

function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/guard-profiles', guardProfilesRouter);
  app.use(globalErrorHandler);
  return app;
}

const baseProfile = () => ({
  id: 'p1',
  name: 'Profile One',
  description: 'existing profile',
  guards: {
    mcpGuard: { enabled: true, type: 'owner' as const },
    rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
    contentFilter: { enabled: true, strictness: 'medium' as const },
    semanticInputGuard: {
      enabled: true,
      prompt: 'Check input safety',
      llmProviderKey: 'openai-main',
      responseSchema: { type: 'boolean' as const, description: 'safe?' },
    },
    semanticOutputGuard: {
      enabled: true,
      prompt: 'Check output safety',
    },
  },
});

describe('guard-profiles semantic guard passthrough', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  describe('POST / (create)', () => {
    it('preserves semanticInputGuard and semanticOutputGuard fields', async () => {
      loadGuardrailProfiles.mockReturnValue([]);

      const res = await request(app)
        .post('/api/guard-profiles')
        .send({
          name: 'Semantic Profile',
          guards: {
            semanticInputGuard: {
              enabled: true,
              prompt: 'Is this input safe?',
              llmProviderKey: 'openai-main',
              responseSchema: { type: 'boolean', description: 'true if safe' },
            },
            semanticOutputGuard: {
              enabled: false,
              prompt: 'Is this output safe?',
            },
          },
        });

      expect(res.status).toBe(201);
      const created = res.body.data;
      expect(created.guards.semanticInputGuard).toEqual({
        enabled: true,
        prompt: 'Is this input safe?',
        llmProviderKey: 'openai-main',
        responseSchema: { type: 'boolean', description: 'true if safe' },
      });
      // semanticOutputGuard omits responseSchema, so the schema's default is injected.
      expect(created.guards.semanticOutputGuard).toEqual({
        enabled: false,
        prompt: 'Is this output safe?',
        responseSchema: {
          type: 'boolean',
          description: 'Return true if content should be allowed, false if it should be blocked',
        },
      });

      // Persisted profile carries the same semantic guard config
      expect(saveGuardrailProfiles).toHaveBeenCalledTimes(1);
      const saved = saveGuardrailProfiles.mock.calls[0][0][0];
      expect(saved.guards.semanticInputGuard.prompt).toBe('Is this input safe?');
      expect(saved.guards.semanticOutputGuard.prompt).toBe('Is this output safe?');
    });

    it('defaults semantic guards to disabled when omitted', async () => {
      loadGuardrailProfiles.mockReturnValue([]);

      const res = await request(app)
        .post('/api/guard-profiles')
        .send({
          name: 'Basic Profile',
          guards: {
            rateLimit: { enabled: true, maxRequests: 10, windowMs: 60000 },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.guards.semanticInputGuard).toEqual({ enabled: false });
      expect(res.body.data.guards.semanticOutputGuard).toEqual({ enabled: false });
    });

    it('rejects an enabled semantic guard without a prompt (schema validation)', async () => {
      loadGuardrailProfiles.mockReturnValue([]);

      const res = await request(app)
        .post('/api/guard-profiles')
        .send({
          name: 'Invalid Semantic',
          guards: {
            semanticInputGuard: { enabled: true },
          },
        });

      expect(res.status).toBe(400);
      expect(saveGuardrailProfiles).not.toHaveBeenCalled();
    });
  });

  describe('PUT /:id (update)', () => {
    it('preserves semantic guards when the body only edits other guards', async () => {
      loadGuardrailProfiles.mockReturnValue([baseProfile()]);

      const res = await request(app)
        .put('/api/guard-profiles/p1')
        .send({
          guards: {
            contentFilter: { enabled: false, strictness: 'low' },
          },
        });

      expect(res.status).toBe(200);
      const updated = res.body.data;
      // The edited guard is updated...
      expect(updated.guards.contentFilter.enabled).toBe(false);
      // ...and the untouched guards (including semantic) are preserved.
      expect(updated.guards.mcpGuard).toEqual({ enabled: true, type: 'owner' });
      expect(updated.guards.semanticInputGuard).toEqual(baseProfile().guards.semanticInputGuard);
      expect(updated.guards.semanticOutputGuard).toEqual(baseProfile().guards.semanticOutputGuard);

      const saved = saveGuardrailProfiles.mock.calls[0][0][0];
      expect(saved.guards.semanticInputGuard.prompt).toBe('Check input safety');
      expect(saved.guards.semanticOutputGuard.prompt).toBe('Check output safety');
    });

    it('merges semantic guard updates with the existing config', async () => {
      loadGuardrailProfiles.mockReturnValue([baseProfile()]);

      const res = await request(app)
        .put('/api/guard-profiles/p1')
        .send({
          guards: {
            semanticInputGuard: { prompt: 'Updated input prompt' },
          },
        });

      expect(res.status).toBe(200);
      const updated = res.body.data;
      expect(updated.guards.semanticInputGuard).toEqual({
        enabled: true, // preserved from existing
        prompt: 'Updated input prompt', // updated
        llmProviderKey: 'openai-main', // preserved
        // Omitted from the request, so the schema default is applied on merge.
        responseSchema: {
          type: 'boolean',
          description: 'Return true if content should be allowed, false if it should be blocked',
        },
      });
      // Other guards untouched
      expect(updated.guards.rateLimit).toEqual({ enabled: true, maxRequests: 50, windowMs: 60000 });
    });
  });

  describe('POST /bulk/toggle', () => {
    it('toggles semantic guards alongside the other guard sections', async () => {
      loadGuardrailProfiles.mockReturnValue([baseProfile()]);

      const res = await request(app)
        .post('/api/guard-profiles/bulk/toggle')
        .send({ ids: ['p1'], enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedCount).toBe(1);

      const saved = saveGuardrailProfiles.mock.calls[0][0][0];
      expect(saved.guards.mcpGuard.enabled).toBe(false);
      expect(saved.guards.rateLimit.enabled).toBe(false);
      expect(saved.guards.contentFilter.enabled).toBe(false);
      expect(saved.guards.semanticInputGuard.enabled).toBe(false);
      expect(saved.guards.semanticOutputGuard.enabled).toBe(false);
      // Toggling enabled does not wipe the rest of the semantic config
      expect(saved.guards.semanticInputGuard.prompt).toBe('Check input safety');
    });

    it('leaves absent semantic guard sections undefined when toggling', async () => {
      const profile = baseProfile();
      delete (profile.guards as Record<string, unknown>).semanticInputGuard;
      delete (profile.guards as Record<string, unknown>).semanticOutputGuard;
      loadGuardrailProfiles.mockReturnValue([profile]);

      const res = await request(app)
        .post('/api/guard-profiles/bulk/toggle')
        .send({ ids: ['p1'], enabled: true });

      expect(res.status).toBe(200);
      const saved = saveGuardrailProfiles.mock.calls[0][0][0];
      expect(saved.guards.semanticInputGuard).toBeUndefined();
      expect(saved.guards.semanticOutputGuard).toBeUndefined();
    });
  });
});
