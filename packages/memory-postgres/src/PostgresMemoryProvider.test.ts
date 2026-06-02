import { IServiceDependencies } from '@hivemind/shared-types';
import { PostgresMemoryProvider } from '../src/PostgresMemoryProvider';

describe('PostgresMemoryProvider (Mocked)', () => {
  let provider: PostgresMemoryProvider;
  let mockDbManager: any;
  let mockEmbeddingProvider: any;
  let deps: IServiceDependencies;

  beforeEach(() => {
    mockDbManager = {
      addMemory: jest.fn().mockResolvedValue(1),
      searchMemories: jest
        .fn()
        .mockResolvedValue([
          { id: 1, content: 'test memory', score: 0.9, metadata: { foo: 'bar' } },
        ]),
      getMemories: jest.fn().mockResolvedValue([]),
      getMemoryById: jest.fn().mockResolvedValue(null),
      deleteMemory: jest.fn().mockResolvedValue(true),
      deleteAllMemories: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    mockEmbeddingProvider = {
      name: 'mock-llm',
      generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    deps = {
      logger: console as any,
      errorTypes: {} as any,
      getDatabaseManager: () => mockDbManager,
      getLlmProviders: () => [mockEmbeddingProvider],
    };

    provider = new PostgresMemoryProvider({}, deps);
  });

  it('should add memory with generated embedding', async () => {
    const result = await provider.addMemory('hello world', { foo: 'bar' });

    expect(mockEmbeddingProvider.generateEmbedding).toHaveBeenCalledWith('hello world');
    expect(mockDbManager.addMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'hello world',
        embedding: expect.any(Array),
      })
    );
    expect(result.content).toBe('hello world');
  });

  it('should search memories using embedding', async () => {
    const result = await provider.searchMemories('search query');

    expect(mockEmbeddingProvider.generateEmbedding).toHaveBeenCalledWith('search query');
    expect(mockDbManager.searchMemories).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Object)
    );
    expect(result.results[0].metadata).toEqual({ foo: 'bar' });
  });

  it('should fetch a single memory via a direct indexed lookup, not a full scan', async () => {
    mockDbManager.getMemoryById.mockResolvedValue({
      id: 42,
      content: 'single memory',
      metadata: { foo: 'bar' },
      userId: 'u1',
      agentId: 'a1',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await provider.getMemory('42');

    // Uses the direct WHERE id = ? query, not getMemories({ limit: 1000 }).
    expect(mockDbManager.getMemoryById).toHaveBeenCalledWith('42');
    expect(mockDbManager.getMemories).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        id: '42',
        content: 'single memory',
        metadata: { foo: 'bar' },
        userId: 'u1',
        agentId: 'a1',
      })
    );
  });

  it('should return null when the memory id is not found', async () => {
    mockDbManager.getMemoryById.mockResolvedValue(null);

    const result = await provider.getMemory('does-not-exist');

    expect(mockDbManager.getMemoryById).toHaveBeenCalledWith('does-not-exist');
    expect(mockDbManager.getMemories).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should select a non-OpenAI provider that implements generateEmbedding', async () => {
    const openWebUiLike = {
      name: 'openwebui',
      generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.2)),
    };
    const chatOnly = { name: 'flowise' }; // no generateEmbedding

    const localDeps: IServiceDependencies = {
      ...deps,
      getLlmProviders: () => [chatOnly, openWebUiLike] as any,
    };
    const localProvider = new PostgresMemoryProvider({}, localDeps);

    await localProvider.addMemory('hello');

    expect(openWebUiLike.generateEmbedding).toHaveBeenCalledWith('hello');
  });

  it('should use the configured embedding profile when it supports embeddings', async () => {
    const openai = {
      name: 'openai',
      generateEmbedding: jest.fn().mockResolvedValue(new Array(1536).fill(0.3)),
    };
    const openwebui = {
      name: 'openwebui',
      generateEmbedding: jest.fn().mockResolvedValue(new Array(768).fill(0.4)),
    };

    const localDeps: IServiceDependencies = {
      ...deps,
      getLlmProviders: () => [openai, openwebui] as any,
    };
    const localProvider = new PostgresMemoryProvider(
      { embeddingProfile: 'openwebui' },
      localDeps
    );

    await localProvider.addMemory('hi');

    expect(openwebui.generateEmbedding).toHaveBeenCalledWith('hi');
    expect(openai.generateEmbedding).not.toHaveBeenCalled();
  });

  it('should throw a clear error when the configured profile cannot embed', () => {
    const chatOnly = { name: 'flowise' }; // no generateEmbedding
    const localDeps: IServiceDependencies = {
      ...deps,
      getLlmProviders: () => [chatOnly] as any,
    };

    expect(
      () => new PostgresMemoryProvider({ embeddingProfile: 'flowise' }, localDeps)
    ).toThrow(/does not support embeddings/);
  });

  it('should throw a clear error when the configured profile is missing', () => {
    const localDeps: IServiceDependencies = {
      ...deps,
      getLlmProviders: () => [mockEmbeddingProvider],
    };

    expect(
      () => new PostgresMemoryProvider({ embeddingProfile: 'nonexistent' }, localDeps)
    ).toThrow(/was not found/);
  });

  it('should throw a clear error when no embedding-capable provider is available', async () => {
    const chatOnly = { name: 'flowise' };
    const localDeps: IServiceDependencies = {
      ...deps,
      getLlmProviders: () => [chatOnly] as any,
    };
    const localProvider = new PostgresMemoryProvider({}, localDeps);

    await expect(localProvider.addMemory('hello')).rejects.toThrow(
      /No embedding-capable LLM provider available/
    );
  });
});
