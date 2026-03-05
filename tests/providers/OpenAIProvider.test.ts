import openaiConfig from '../../src/config/openaiConfig';
import { OpenAIProvider } from '../../src/providers/OpenAIProvider';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
  });

  it('should have correct id and type', () => {
    expect(provider.id).toBe('openai');
    expect(provider.type).toBe('llm');
    expect(provider.label).toBe('OpenAI');
  });

  it('should return schema', () => {
    const schema = provider.getSchema();
    expect(schema).toBeDefined();
    const props = (schema as any).properties || (schema as any)._cvtProperties || schema;
    expect(props.OPENAI_API_KEY).toBeDefined();
  });

  it('should return sensitive keys', () => {
    const keys = provider.getSensitiveKeys();
    expect(keys).toContain('OPENAI_API_KEY');
  });

  it('should return config', () => {
    const config = provider.getConfig();
    expect(config).toBe(openaiConfig);
  });
});
