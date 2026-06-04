import { describe, it, expect } from 'vitest';
import { mem0ProviderSchema } from '../mem0';

/**
 * The runtime `Mem0Provider` is a thin client for the hosted Mem0 platform
 * REST API (api.mem0.ai). That API manages the LLM, embedder, vector store and
 * history DB at the project level — none of them are accepted per-request, and
 * the provider never reads or forwards them. Self-hosted OSS config knobs
 * (llmProvider/llmModel/embedderModel/vectorStoreProvider/historyDbPath) must
 * therefore NOT appear in the UI schema, or users would set values that do
 * nothing. This test guards against them being reintroduced.
 */
describe('mem0ProviderSchema', () => {
  const fieldNames = mem0ProviderSchema.fields.map((f) => f.name);

  it('does not surface OSS-only self-hosted config fields', () => {
    const ossOnly = [
      'llmProvider',
      'llmModel',
      'embedderModel',
      'vectorStoreProvider',
      'historyDbPath',
    ];
    for (const name of ossOnly) {
      expect(fieldNames).not.toContain(name);
    }
  });

  it('does not seed OSS-only fields via defaultConfig', () => {
    const defaults = mem0ProviderSchema.defaultConfig ?? {};
    expect(defaults).not.toHaveProperty('llmProvider');
    expect(defaults).not.toHaveProperty('llmModel');
    expect(defaults).not.toHaveProperty('embedderModel');
    expect(defaults).not.toHaveProperty('vectorStoreProvider');
    expect(defaults).not.toHaveProperty('historyDbPath');
  });

  it('exposes exactly the fields the hosted REST client honours', () => {
    expect(fieldNames).toEqual([
      'apiKey',
      'baseUrl',
      'orgId',
      'userId',
      'agentId',
      'timeoutMs',
      'maxRetries',
    ]);
  });

  it('labels the API key as a Mem0 platform key, not an OpenAI key', () => {
    const apiKey = mem0ProviderSchema.fields.find((f) => f.name === 'apiKey');
    expect(apiKey).toBeDefined();
    expect(apiKey?.label).not.toMatch(/openai/i);
    expect(apiKey?.required).toBe(true);
  });
});
