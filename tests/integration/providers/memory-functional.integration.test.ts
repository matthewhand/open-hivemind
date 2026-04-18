import { Mem0Provider } from '@hivemind/memory-mem0';
import { Mem4aiProvider } from '@hivemind/memory-mem4ai';

// We use relative paths here because the packages might not be fully built/linked in all CI environments
// and we want to test the actual source. But we can also try the aliases if they fail.

describe('Memory Provider Functional Integration', () => {
  const mem0Options = {
    apiKey: 'fake-key',
    baseUrl: 'http://localhost:1234',
    userId: 'u1'
  };

  const mem4aiOptions = {
    apiKey: 'fake-key',
    apiUrl: 'http://localhost:5678',
    userId: 'u1'
  };

  it('should instantiate Mem0Provider with real schema validation', () => {
    const provider = new Mem0Provider(mem0Options);
    expect(provider).toBeDefined();
    expect(typeof provider.search).toBe('function');
  });

  it('should instantiate Mem4aiProvider with real schema validation', () => {
    const provider = new Mem4aiProvider(mem4aiOptions);
    expect(provider).toBeDefined();
    expect(typeof provider.search).toBe('function');
  });
});
