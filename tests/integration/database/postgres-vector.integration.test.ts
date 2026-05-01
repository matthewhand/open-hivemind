import 'reflect-metadata';
import dotenv from 'dotenv';
import { PostgresMemoryProvider } from '../../../packages/memory-postgres/src/PostgresMemoryProvider';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { getServiceDependencies } from '../../../src/utils/serviceDependencies';

dotenv.config();

describe('Postgres Native Vector Memory Integration', () => {
  const dbUrl = process.env.DATABASE_URL;
  const hasOpenAiKey = !!(process.env.OPENAI_API_KEY || process.env.HIVEMIND_OPENAI_API_KEY);
  const describeIfEnabled = dbUrl && hasOpenAiKey ? describe : describe.skip;

  if (!hasOpenAiKey && dbUrl) {
    console.warn('Skipping Postgres Vector test: OPENAI_API_KEY is missing');
  }

  describeIfEnabled('Vector Operations with Neon.tech', () => {
    let dbManager: DatabaseManager;
    let memoryProvider: PostgresMemoryProvider;

    beforeAll(async () => {
      (DatabaseManager as any).instance = undefined;
      dbManager = DatabaseManager.getInstance({ type: 'postgres' });
      await dbManager.connect();

      // Manually register an embedding provider for the test
      const { OpenAiProvider } = await import('../../../packages/llm-openai/src/openAiProvider');
      const { SyncProviderRegistry } = await import('../../../src/registries/SyncProviderRegistry');
      const registry = SyncProviderRegistry.getInstance();

      // Reset registry to ensure clean state
      registry.reset();

      const openai = new OpenAiProvider();
      // @ts-ignore - hacking it into the registry for the test
      registry.llmProviders.set('openai', openai);
      // @ts-ignore
      registry._initialized = true;

      const deps = getServiceDependencies('test-vector');
      memoryProvider = new PostgresMemoryProvider({}, deps);
    });

    afterAll(async () => {
      if (dbManager && dbManager.isConnected()) {
        await memoryProvider.deleteAll();
        await dbManager.disconnect();
      }
    });

    it('should add and search memories using vector similarity', async () => {
      // 1. Add some memories
      await memoryProvider.addMemory('The capital of France is Paris', { topic: 'geography' });
      await memoryProvider.addMemory('The capital of Japan is Tokyo', { topic: 'geography' });
      await memoryProvider.addMemory('Pizza is a popular Italian dish', { topic: 'food' });

      // 2. Search for something similar to "What is the capital of France?"
      const results = await memoryProvider.searchMemories('What is the capital of France?', {
        limit: 1,
      });

      expect(results.results).toHaveLength(1);
      expect(results.results[0].content).toContain('Paris');
      expect(results.results[0].score).toBeGreaterThan(0.8);
    });

    it('should respect user/agent scoping', async () => {
      const userId = 'user-123';
      await memoryProvider.addMemory('Secret key is 42', { secret: true }, { userId });

      const allResults = await memoryProvider.searchMemories('What is the secret?', { limit: 5 });
      const scopedResults = await memoryProvider.searchMemories('What is the secret?', {
        userId,
        limit: 5,
      });

      expect(scopedResults.results.some((r) => r.content.includes('42'))).toBe(true);
    });
  });
});
