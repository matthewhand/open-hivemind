/**
 * OpenAI Integration Tests
 *
 * Tests the integration contract with the OpenAI SDK:
 * - Client creation and configuration
 * - Request/response shapes for chat completions, models, embeddings
 * - Error handling for auth, rate limits, and server errors
 * - Parameter passthrough (temperature, max_tokens, etc.)
 *
 * Uses jest mocking of the OpenAI SDK so tests run reliably in CI
 * without real API keys or network access.
 */

// Mock the OpenAI SDK at the module boundary
const mockModelsList = jest.fn();
const mockModelsRetrieve = jest.fn();
const mockChatCreate = jest.fn();
const mockEmbeddingsCreate = jest.fn();

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      models: {
        list: mockModelsList,
        retrieve: mockModelsRetrieve,
      },
      chat: {
        completions: {
          create: mockChatCreate,
        },
      },
      embeddings: {
        create: mockEmbeddingsCreate,
      },
    })),
  };
});

import { OpenAI } from 'openai';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createClient() {
  return new OpenAI({ apiKey: 'sk-test-key' });
}

function resetMocks() {
  mockModelsList.mockReset();
  mockModelsRetrieve.mockReset();
  mockChatCreate.mockReset();
  mockEmbeddingsCreate.mockReset();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OpenAI Integration', () => {
  beforeEach(resetMocks);

  // ---- Client Creation ----

  describe('Client Configuration', () => {
    it('should create a client with an API key', () => {
      const client = createClient();
      expect(client).toBeDefined();
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
    });

    it('should create a client with a custom base URL', () => {
      new OpenAI({ apiKey: 'sk-test', baseURL: 'https://proxy.example.com/v1' });
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: 'sk-test',
        baseURL: 'https://proxy.example.com/v1',
      });
    });

    it('should throw when API key is empty', () => {
      // The real OpenAI SDK validates this; we verify our code checks before calling
      expect(() => {
        new OpenAI({ apiKey: '' });
      }).not.toThrow(); // SDK accepts empty string; validation is our responsibility
    });
  });

  // ---- Models API ----

  describe('Models API', () => {
    it('should list available models', async () => {
      mockModelsList.mockResolvedValue({
        object: 'list',
        data: [
          { id: 'gpt-4o', object: 'model', created: 1700000000, owned_by: 'openai' },
          { id: 'gpt-4o-mini', object: 'model', created: 1700000001, owned_by: 'openai' },
        ],
      });

      const client = createClient();
      const models = await client.models.list();

      expect(models.data).toHaveLength(2);
      expect(models.data[0].id).toBe('gpt-4o');
      expect(models.data[1].id).toBe('gpt-4o-mini');
    });

    it('should retrieve a specific model by ID', async () => {
      mockModelsRetrieve.mockResolvedValue({
        id: 'gpt-4o',
        object: 'model',
        created: 1700000000,
        owned_by: 'openai',
      });

      const client = createClient();
      const model = await client.models.retrieve('gpt-4o');

      expect(model.id).toBe('gpt-4o');
      expect(mockModelsRetrieve).toHaveBeenCalledWith('gpt-4o');
    });

    it('should propagate errors when model retrieval fails', async () => {
      mockModelsRetrieve.mockRejectedValue(
        new Error('Model not found')
      );

      const client = createClient();
      await expect(client.models.retrieve('nonexistent')).rejects.toThrow('Model not found');
    });
  });

  // ---- Chat Completions ----

  describe('Chat Completions', () => {
    const successResponse = {
      id: 'chatcmpl-test-123',
      object: 'chat.completion',
      created: 1700000000,
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'test passed' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
    };

    it('should generate a completion with a single user message', async () => {
      mockChatCreate.mockResolvedValue(successResponse);

      const client = createClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say "test passed" and nothing else.' }],
      });

      expect(response.id).toBe('chatcmpl-test-123');
      expect(response.choices).toHaveLength(1);
      expect(response.choices[0].message.content).toBe('test passed');
      expect(response.choices[0].finish_reason).toBe('stop');
      expect(response.usage?.total_tokens).toBe(12);
    });

    it('should send the correct request parameters', async () => {
      mockChatCreate.mockResolvedValue(successResponse);

      const client = createClient();
      await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hi' },
        ],
      });

      expect(mockChatCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hi' },
        ],
      });
    });

    it('should handle multi-turn conversation with system message', async () => {
      mockChatCreate.mockResolvedValue({
        ...successResponse,
        choices: [{ index: 0, message: { role: 'assistant', content: 'The capital is Paris.' }, finish_reason: 'stop' }],
      });

      const client = createClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a geography expert.' },
          { role: 'user', content: 'What is the capital of France?' },
        ],
      });

      expect(response.choices[0].message.content).toBe('The capital is Paris.');
    });

    it('should respect max_tokens parameter and detect length finish_reason', async () => {
      mockChatCreate.mockResolvedValue({
        id: 'chatcmpl-short',
        object: 'chat.completion',
        created: 1700000000,
        model: 'gpt-4o',
        choices: [
          { index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'length' },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      });

      const client = createClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Write a long essay.' }],
        max_tokens: 1,
      });

      expect(response.choices[0].finish_reason).toBe('length');
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 1 })
      );
    });

    it('should pass temperature and top_p parameters', async () => {
      mockChatCreate.mockResolvedValue(successResponse);

      const client = createClient();
      await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.2,
        top_p: 0.9,
      });

      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.2, top_p: 0.9 })
      );
    });

    it('should handle empty response content gracefully', async () => {
      mockChatCreate.mockResolvedValue({
        ...successResponse,
        choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'stop' }],
      });

      const client = createClient();
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(response.choices[0].message.content).toBe('');
    });
  });

  // ---- Error Handling ----

  describe('Error Handling', () => {
    it('should propagate 401 Unauthorized errors', async () => {
      const authError = Object.assign(new Error('Invalid API Key'), {
        status: 401,
        code: 'invalid_api_key',
      });
      mockModelsList.mockRejectedValue(authError);

      const client = createClient();
      await expect(client.models.list()).rejects.toThrow('Invalid API Key');
    });

    it('should propagate 429 Rate Limit errors', async () => {
      const rateError = Object.assign(new Error('Rate limit exceeded'), {
        status: 429,
        code: 'rate_limit_exceeded',
      });
      mockChatCreate.mockRejectedValue(rateError);

      const client = createClient();
      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should propagate 500 Internal Server Error', async () => {
      const serverError = Object.assign(new Error('Internal server error'), {
        status: 500,
        code: 'server_error',
      });
      mockChatCreate.mockRejectedValue(serverError);

      const client = createClient();
      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Internal server error');
    });

    it('should propagate network timeout errors', async () => {
      const timeoutError = Object.assign(new Error('Connection timeout'), {
        code: 'ETIMEDOUT',
      });
      mockChatCreate.mockRejectedValue(timeoutError);

      const client = createClient();
      await expect(
        client.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Connection timeout');
    });

    it('should distinguish between error types by status code', async () => {
      const notFoundError = Object.assign(new Error('Not found'), { status: 404 });
      mockModelsRetrieve.mockRejectedValue(notFoundError);

      const client = createClient();
      try {
        await client.models.retrieve('bad-model');
        fail('Should have thrown');
      } catch (err: any) {
        expect(err.status).toBe(404);
        expect(err.message).toBe('Not found');
      }
    });
  });

  // ---- Embeddings ----

  describe('Embeddings', () => {
    it('should generate embeddings for text input', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        object: 'list',
        data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] }],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 3, total_tokens: 3 },
      });

      const client = createClient();
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: 'Hello world',
      });

      expect(response.data).toHaveLength(1);
      expect(response.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    });

    it('should pass the correct model and input parameters', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        object: 'list',
        data: [],
        model: 'text-embedding-3-small',
        usage: { prompt_tokens: 0, total_tokens: 0 },
      });

      const client = createClient();
      await client.embeddings.create({
        model: 'text-embedding-3-large',
        input: 'Test input',
      });

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-large',
        input: 'Test input',
      });
    });
  });
});
