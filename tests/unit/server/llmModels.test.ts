/**
 * Tests for the static LLM model catalog (src/server/data/llmModels.ts).
 *
 * Focus: every implemented provider type must be accepted by the catalog so
 * GET /api/admin/llm-providers/:type/models does not 400 with
 * INVALID_PROVIDER_TYPE for wired providers (flowise, letta, openwebui,
 * openswarm). The route validates the `:type` param against
 * getSupportedProviders() and serves entries from getModelsForProvider().
 */

import {
  getChatModels,
  getEmbeddingModels,
  getModelsForProvider,
  getSupportedProviders,
} from '../../../src/server/data/llmModels';

describe('llmModels static catalog', () => {
  describe('getSupportedProviders', () => {
    it('includes the original hosted providers', () => {
      const providers = getSupportedProviders();
      expect(providers).toEqual(
        expect.arrayContaining(['openai', 'anthropic', 'google', 'perplexity'])
      );
    });

    it.each(['flowise', 'letta', 'openwebui', 'openswarm'])(
      'includes implemented provider "%s" so the models route does not reject it',
      (provider) => {
        expect(getSupportedProviders()).toContain(provider);
      }
    );
  });

  describe('getModelsForProvider', () => {
    it.each(['flowise', 'letta', 'openwebui', 'openswarm'])(
      'returns a non-empty static model list for "%s"',
      (provider) => {
        const models = getModelsForProvider(provider);
        expect(models.length).toBeGreaterThan(0);
        for (const model of models) {
          expect(model.id).toBeTruthy();
          expect(model.name).toBeTruthy();
          expect(['chat', 'embedding', 'both']).toContain(model.type);
        }
      }
    );

    it('is case-insensitive for the new providers', () => {
      expect(getModelsForProvider('OpenWebUI')).toEqual(getModelsForProvider('openwebui'));
    });

    it('still returns an empty list for unknown providers', () => {
      expect(getModelsForProvider('not-a-provider')).toEqual([]);
    });
  });

  describe('package-default model entries', () => {
    it('lists the OpenWebUI package defaults (chat + embedding)', () => {
      const ids = getModelsForProvider('openwebui').map((m) => m.id);
      expect(ids).toContain('llama3.2'); // OPEN_WEBUI_MODEL default
      expect(ids).toContain('nomic-embed-text'); // OPEN_WEBUI_EMBEDDING_MODEL default

      expect(getChatModels('openwebui').map((m) => m.id)).toContain('llama3.2');
      expect(getEmbeddingModels('openwebui').map((m) => m.id)).toContain('nomic-embed-text');
    });

    it('lists the Flowise chatflow slots', () => {
      const ids = getModelsForProvider('flowise').map((m) => m.id);
      expect(ids).toEqual(expect.arrayContaining(['conversation-chatflow', 'completion-chatflow']));
    });

    it('lists the Letta default agent entry', () => {
      expect(getModelsForProvider('letta').map((m) => m.id)).toContain('default-agent');
    });

    it('lists the OpenSwarm default team (OPENSWARM_TEAM default)', () => {
      expect(getModelsForProvider('openswarm').map((m) => m.id)).toContain('default-team');
    });
  });
});
