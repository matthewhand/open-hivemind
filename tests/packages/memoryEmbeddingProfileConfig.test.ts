import { Mem4aiProvider } from '../../packages/memory-mem4ai/src/mem4aiProvider';
import { MemVaultProvider } from '../../packages/memory-memvault/src/memVaultProvider';

describe('memory embedding profile configuration', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('Mem4aiProvider sends embeddingProviderId as embedding provider identifiers', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'memory-1',
        content: 'hello',
        metadata: { source: 'test' },
        created_at: 123,
        tags: ['default'],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new Mem4aiProvider({
      apiUrl: 'https://mem4.ai',
      apiKey: 'test-key',
      embeddingProviderId: 'embed-openai',
    });

    await provider.addMemory('hello', { source: 'test' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://mem4.ai/memories',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const request = fetchMock.mock.calls[0]?.[1];
    expect(request).toBeDefined();
    expect(JSON.parse(String(request?.body))).toMatchObject({
      content: 'hello',
      embedding_provider_id: 'embed-openai',
      embedding_profile_key: 'embed-openai',
    });
  });

  test('Mem4aiProvider falls back to deprecated embeddingProfileKey', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new Mem4aiProvider({
      apiUrl: 'https://mem4.ai',
      apiKey: 'test-key',
      embeddingProfileKey: 'legacy-embed',
    });

    await provider.searchMemories('hello');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://mem4.ai/memories/search?query=hello&limit=10&embedding_provider_id=legacy-embed&embedding_profile_key=legacy-embed',
      expect.objectContaining({
        method: 'GET',
      })
    );
  });

  test('MemVaultProvider passes llmProfileKey into the embedding resolver', async () => {
    const embeddingResolver = jest.fn().mockResolvedValue([0.1, 0.2, 0.3]);

    const provider = new MemVaultProvider({
      host: 'localhost',
      port: 5432,
      database: 'memvault',
      user: 'postgres',
      password: 'postgres',
      llmProfileKey: 'embed-openai',
      embeddingResolver,
    });

    const embedding = await (provider as any).generateEmbedding('hello world');

    expect(embedding).toEqual([0.1, 0.2, 0.3]);
    expect(embeddingResolver).toHaveBeenCalledWith('hello world', 'embed-openai');
  });
});
