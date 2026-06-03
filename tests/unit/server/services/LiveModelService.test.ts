import { getModelsForProvider } from '../../../../src/server/data/llmModels';
import {
  getLiveModelsForProvider,
  supportsLiveModels,
} from '../../../../src/server/services/LiveModelService';

/**
 * Tests for LiveModelService, which queries a provider's live model-list
 * endpoint (OpenAI-compatible `GET /models`) and falls back to the curated
 * static list on failure / for unsupported providers.
 *
 * The OpenAI SDK and the provider config modules are mocked so no network
 * calls are made and the live branch is deterministically exercised.
 */

const mockModelsList = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    models: { list: mockModelsList },
  })),
}));

// Provide a non-empty OpenAI API key so the live branch is attempted regardless
// of the real environment / config files.
jest.mock('../../../../src/config/openaiConfig', () => {
  const get = (key: string): string => {
    if (key === 'OPENAI_API_KEY') return 'sk-test-key';
    return 'https://api.openai.com/v1';
  };
  return { __esModule: true, default: { get } };
});

describe('LiveModelService', () => {
  beforeEach(() => {
    mockModelsList.mockReset();
  });

  describe('supportsLiveModels', () => {
    it('reports live support for openai and openwebui', () => {
      expect(supportsLiveModels('openai')).toBe(true);
      expect(supportsLiveModels('OpenAI')).toBe(true);
      expect(supportsLiveModels('openwebui')).toBe(true);
    });

    it('reports no live support for providers without a model-list endpoint', () => {
      expect(supportsLiveModels('anthropic')).toBe(false);
      expect(supportsLiveModels('google')).toBe(false);
    });
  });

  describe('getLiveModelsForProvider', () => {
    it('returns live models from the provider when the query succeeds', async () => {
      mockModelsList.mockResolvedValue({
        data: [{ id: 'gpt-4o' }, { id: 'some-new-future-model' }],
      });

      const result = await getLiveModelsForProvider('openai');

      expect(result.source).toBe('live');
      const ids = result.models.map((m) => m.id);
      expect(ids).toContain('gpt-4o');
      expect(ids).toContain('some-new-future-model');

      // Known models are enriched from the static metadata.
      const known = result.models.find((m) => m.id === 'gpt-4o');
      expect(known?.name).toBe('GPT-4o');
      // Unknown models get a minimal metadata record.
      const unknown = result.models.find((m) => m.id === 'some-new-future-model');
      expect(unknown?.type).toBe('chat');
    });

    it('falls back to the static list when the live query throws', async () => {
      mockModelsList.mockRejectedValue(new Error('network down'));

      const result = await getLiveModelsForProvider('openai');

      expect(result.source).toBe('static');
      expect(result.models).toEqual(getModelsForProvider('openai'));
    });

    it('falls back to the static list when the live query returns no models', async () => {
      mockModelsList.mockResolvedValue({ data: [] });

      const result = await getLiveModelsForProvider('openai');

      expect(result.source).toBe('static');
      expect(result.models).toEqual(getModelsForProvider('openai'));
    });

    it('returns the static list without a live query for unsupported providers', async () => {
      const result = await getLiveModelsForProvider('anthropic');

      expect(result.source).toBe('static');
      expect(mockModelsList).not.toHaveBeenCalled();
      expect(result.models).toEqual(getModelsForProvider('anthropic'));
    });
  });
});
