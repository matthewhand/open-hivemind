/**
 * Integration test: memory pipeline through messageHandler flow.
 *
 * Tests the full conceptual flow: search memories -> inject into prompt ->
 * LLM generates response -> store new memories.
 * All external services are mocked. Verifies failure isolation.
 */

/* ---------- types --------------------------------------------------------- */

interface MemoryResult {
  id: string;
  memory: string;
  score?: number;
}

interface MemoryManager {
  search(providerId: string, query: string, options?: any): Promise<{ results: MemoryResult[] }>;
  store(providerId: string, messages: any[], options?: any): Promise<{ results: MemoryResult[] }>;
  formatForPrompt(memories: MemoryResult[]): string;
}

interface LLMProvider {
  generateChatCompletion(text: string, history: any[], options: any): Promise<{ text: string }>;
}

/* ---------- inline pipeline implementation -------------------------------- */

async function memoryAugmentedMessageHandler(options: {
  memoryManager: MemoryManager;
  llmProvider: LLMProvider;
  providerId: string;
  userId: string;
  messageText: string;
  systemPrompt: string;
}): Promise<{ response: string | null; memoriesUsed: MemoryResult[]; memoryStored: boolean }> {
  const { memoryManager, llmProvider, providerId, userId, messageText, systemPrompt } = options;

  let memoriesUsed: MemoryResult[] = [];
  let augmentedPrompt = systemPrompt;

  // Step 1: Search for relevant memories
  try {
    const { results } = await memoryManager.search(providerId, messageText, { userId, limit: 5 });
    memoriesUsed = results;
    if (results.length > 0) {
      const memoryBlock = memoryManager.formatForPrompt(results);
      augmentedPrompt = `${systemPrompt}\n\n${memoryBlock}`;
    }
  } catch {
    // Memory search failure should not block response
  }

  // Step 2: Generate LLM response with injected memories
  let response: string | null = null;
  try {
    const llmResponse = await llmProvider.generateChatCompletion(messageText, [], {
      systemPrompt: augmentedPrompt,
    });
    response = llmResponse.text || null;
  } catch {
    return { response: null, memoriesUsed, memoryStored: false };
  }

  // Step 3: Store conversation in memory
  let memoryStored = false;
  if (response) {
    try {
      await memoryManager.store(
        providerId,
        [
          { role: 'user', content: messageText },
          { role: 'assistant', content: response },
        ],
        { userId }
      );
      memoryStored = true;
    } catch {
      // Store failure should not affect response
    }
  }

  return { response, memoriesUsed, memoryStored };
}

/* ---------- tests --------------------------------------------------------- */

describe('Memory Pipeline Integration', () => {
  let memoryManager: jest.Mocked<MemoryManager>;
  let llmProvider: jest.Mocked<LLMProvider>;

  beforeEach(() => {
    memoryManager = {
      search: jest.fn().mockResolvedValue({
        results: [
          { id: 'm1', memory: 'User likes TypeScript', score: 0.95 },
          { id: 'm2', memory: 'User works at Acme Corp', score: 0.85 },
        ],
      }),
      store: jest.fn().mockResolvedValue({ results: [{ id: 'm3', memory: 'new memory' }] }),
      formatForPrompt: jest.fn().mockReturnValue(
        '[Relevant memories]\n1. User likes TypeScript\n2. User works at Acme Corp\n[End memories]'
      ),
    };

    llmProvider = {
      generateChatCompletion: jest.fn().mockResolvedValue({
        text: 'Since you like TypeScript, here is a tip...',
      }),
    };
  });

  /* -- full happy path ---------------------------------------------------- */

  describe('full pipeline', () => {
    it('searches memories, injects into prompt, generates response, stores new memory', async () => {
      const result = await memoryAugmentedMessageHandler({
        memoryManager,
        llmProvider,
        providerId: 'mem0',
        userId: 'user1',
        messageText: 'Give me a coding tip',
        systemPrompt: 'You are a helpful assistant.',
      });

      // Search was called with the user message
      expect(memoryManager.search).toHaveBeenCalledWith('mem0', 'Give me a coding tip', {
        userId: 'user1',
        limit: 5,
      });

      // Format was called with results
      expect(memoryManager.formatForPrompt).toHaveBeenCalledWith([
        { id: 'm1', memory: 'User likes TypeScript', score: 0.95 },
        { id: 'm2', memory: 'User works at Acme Corp', score: 0.85 },
      ]);

      // LLM was called with augmented system prompt
      expect(llmProvider.generateChatCompletion).toHaveBeenCalledWith(
        'Give me a coding tip',
        [],
        expect.objectContaining({
          systemPrompt: expect.stringContaining('[Relevant memories]'),
        })
      );

      // New memories stored
      expect(memoryManager.store).toHaveBeenCalledWith(
        'mem0',
        [
          { role: 'user', content: 'Give me a coding tip' },
          { role: 'assistant', content: 'Since you like TypeScript, here is a tip...' },
        ],
        { userId: 'user1' }
      );

      expect(result.response).toBe('Since you like TypeScript, here is a tip...');
      expect(result.memoriesUsed).toHaveLength(2);
      expect(result.memoryStored).toBe(true);
    });

    it('works with no existing memories', async () => {
      memoryManager.search.mockResolvedValue({ results: [] });

      const result = await memoryAugmentedMessageHandler({
        memoryManager,
        llmProvider,
        providerId: 'mem0',
        userId: 'user1',
        messageText: 'Hello',
        systemPrompt: 'You are helpful.',
      });

      // LLM should receive the original system prompt (no memory block)
      expect(llmProvider.generateChatCompletion).toHaveBeenCalledWith('Hello', [], {
        systemPrompt: 'You are helpful.',
      });
      expect(result.memoriesUsed).toEqual([]);
      expect(result.response).toBeTruthy();
    });
  });

  /* -- failure isolation -------------------------------------------------- */

  describe('failure isolation', () => {
    it('still generates response when memory search fails', async () => {
      memoryManager.search.mockRejectedValue(new Error('Mem0 API down'));

      const result = await memoryAugmentedMessageHandler({
        memoryManager,
        llmProvider,
        providerId: 'mem0',
        userId: 'user1',
        messageText: 'Hello',
        systemPrompt: 'You are helpful.',
      });

      expect(result.response).toBeTruthy();
      expect(result.memoriesUsed).toEqual([]);
    });

    it('still returns response when memory store fails', async () => {
      memoryManager.store.mockRejectedValue(new Error('Store quota exceeded'));

      const result = await memoryAugmentedMessageHandler({
        memoryManager,
        llmProvider,
        providerId: 'mem0',
        userId: 'user1',
        messageText: 'Hello',
        systemPrompt: 'You are helpful.',
      });

      expect(result.response).toBeTruthy();
      expect(result.memoryStored).toBe(false);
    });

    it('returns null response when LLM fails', async () => {
      llmProvider.generateChatCompletion.mockRejectedValue(new Error('LLM timeout'));

      const result = await memoryAugmentedMessageHandler({
        memoryManager,
        llmProvider,
        providerId: 'mem0',
        userId: 'user1',
        messageText: 'Hello',
        systemPrompt: 'You are helpful.',
      });

      expect(result.response).toBeNull();
      expect(result.memoryStored).toBe(false);
    });

    it('does not store memories when LLM returns empty text', async () => {
      llmProvider.generateChatCompletion.mockResolvedValue({ text: '' });

      const result = await memoryAugmentedMessageHandler({
        memoryManager,
        llmProvider,
        providerId: 'mem0',
        userId: 'user1',
        messageText: 'Hello',
        systemPrompt: 'You are helpful.',
      });

      expect(result.response).toBeNull();
      expect(memoryManager.store).not.toHaveBeenCalled();
    });

    it('handles both search and store failures gracefully', async () => {
      memoryManager.search.mockRejectedValue(new Error('search fail'));
      memoryManager.store.mockRejectedValue(new Error('store fail'));

      const result = await memoryAugmentedMessageHandler({
        memoryManager,
        llmProvider,
        providerId: 'mem0',
        userId: 'user1',
        messageText: 'Hello',
        systemPrompt: 'You are helpful.',
      });

      expect(result.response).toBeTruthy();
      expect(result.memoryStored).toBe(false);
    });
  });
});
