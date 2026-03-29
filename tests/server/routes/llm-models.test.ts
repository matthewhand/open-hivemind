import {
  getModelsForProvider,
  getChatModels,
  getEmbeddingModels,
  getSupportedProviders,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
} from '../../../src/server/data/llmModels';

describe('LLM Models Data', () => {
  describe('getSupportedProviders', () => {
    it('should return list of supported providers', () => {
      const providers = getSupportedProviders();
      expect(providers).toBeInstanceOf(Array);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });
  });

  describe('getModelsForProvider', () => {
    it('should return OpenAI models', () => {
      const models = getModelsForProvider('openai');
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('id');
      expect(models[0]).toHaveProperty('name');
      expect(models[0]).toHaveProperty('type');
    });

    it('should return Anthropic models', () => {
      const models = getModelsForProvider('anthropic');
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown provider', () => {
      const models = getModelsForProvider('unknown-provider');
      expect(models).toEqual([]);
    });

    it('should be case insensitive', () => {
      const models = getModelsForProvider('OpenAI');
      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('getChatModels', () => {
    it('should return only chat models for OpenAI', () => {
      const models = getChatModels('openai');
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      models.forEach(model => {
        expect(['chat', 'both']).toContain(model.type);
      });
    });

    it('should include GPT-4 models', () => {
      const models = getChatModels('openai');
      const hasGpt4 = models.some(m => m.id.startsWith('gpt-4'));
      expect(hasGpt4).toBe(true);
    });
  });

  describe('getEmbeddingModels', () => {
    it('should return only embedding models for OpenAI', () => {
      const models = getEmbeddingModels('openai');
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      models.forEach(model => {
        expect(['embedding', 'both']).toContain(model.type);
      });
    });

    it('should include text-embedding models', () => {
      const models = getEmbeddingModels('openai');
      const hasEmbedding = models.some(m => m.id.includes('embedding'));
      expect(hasEmbedding).toBe(true);
    });
  });

  describe('OpenAI Models', () => {
    it('should include latest models', () => {
      const modelIds = OPENAI_MODELS.map(m => m.id);
      expect(modelIds).toContain('gpt-4o');
      expect(modelIds).toContain('gpt-4o-mini');
      expect(modelIds).toContain('gpt-3.5-turbo');
    });

    it('should include pricing information', () => {
      const gpt4o = OPENAI_MODELS.find(m => m.id === 'gpt-4o');
      expect(gpt4o).toBeDefined();
      expect(gpt4o?.pricing).toBeDefined();
      expect(gpt4o?.pricing?.input).toBeGreaterThan(0);
      expect(gpt4o?.pricing?.output).toBeGreaterThan(0);
    });

    it('should include context window information', () => {
      const gpt4o = OPENAI_MODELS.find(m => m.id === 'gpt-4o');
      expect(gpt4o?.contextWindow).toBeDefined();
      expect(gpt4o?.contextWindow).toBeGreaterThan(0);
    });
  });

  describe('Anthropic Models', () => {
    it('should include Claude 3.5 models', () => {
      const modelIds = ANTHROPIC_MODELS.map(m => m.id);
      const hasClaude35 = modelIds.some(id => id.includes('claude-3-5'));
      expect(hasClaude35).toBe(true);
    });

    it('should include Claude 3 Opus, Sonnet, and Haiku', () => {
      const modelIds = ANTHROPIC_MODELS.map(m => m.id);
      expect(modelIds.some(id => id.includes('opus'))).toBe(true);
      expect(modelIds.some(id => id.includes('sonnet'))).toBe(true);
      expect(modelIds.some(id => id.includes('haiku'))).toBe(true);
    });

    it('should mark legacy models as deprecated', () => {
      const claude2 = ANTHROPIC_MODELS.find(m => m.id === 'claude-2.1');
      expect(claude2?.deprecated).toBe(true);
    });

    it('should have vision support for Claude 3 models', () => {
      const claude3 = ANTHROPIC_MODELS.find(m => m.id.includes('claude-3-'));
      expect(claude3?.supportsVision).toBe(true);
    });
  });

  describe('Model Metadata', () => {
    it('should have required fields for all models', () => {
      const allModels = [
        ...OPENAI_MODELS,
        ...ANTHROPIC_MODELS,
      ];

      allModels.forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.description).toBeDefined();
        expect(model.type).toBeDefined();
        expect(['chat', 'embedding', 'both']).toContain(model.type);
      });
    });
  });
});
