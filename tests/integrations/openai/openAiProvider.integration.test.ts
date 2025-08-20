import { OpenAiProvider } from '@src/integrations/openai/openAiProvider';
import OpenAI from 'openai';

jest.mock('openai');

describe('OpenAiProvider Integration', () => {
  let provider: OpenAiProvider;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;
    
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);
    provider = new OpenAiProvider();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle rate limiting with exponential backoff', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).status = 429;
    
    mockOpenAI.chat.completions.create
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Success after retry' } }]
      } as any);

    const result = await provider.generateChatCompletion('test message', [], {});
    
    expect(result).toBe('Success after retry');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
  });

  it('should handle server errors with retry', async () => {
    const serverError = new Error('Internal server error');
    (serverError as any).status = 500;
    
    mockOpenAI.chat.completions.create
      .mockRejectedValueOnce(serverError)
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Success after server error' } }]
      } as any);

    const result = await provider.generateChatCompletion('test message', [], {});
    
    expect(result).toBe('Success after server error');
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
  });

  it('should not retry on client errors', async () => {
    const clientError = new Error('Bad request');
    (clientError as any).status = 400;
    
    mockOpenAI.chat.completions.create.mockRejectedValue(clientError);

    await expect(provider.generateChatCompletion('test message', [], {}))
      .rejects.toThrow('Bad request');
    
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
  });

  it('should redact sensitive information in logs', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    mockOpenAI.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: 'Response' } }]
    } as any);

    await provider.generateChatCompletion('My API key is sk-1234567890', [], {});
    
    // Verify no sensitive data is logged
    const logCalls = consoleSpy.mock.calls.flat().join(' ');
    expect(logCalls).not.toContain('sk-1234567890');
    
    consoleSpy.mockRestore();
  });

  it('should handle streaming responses', async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: 'Hello ' } }] };
        yield { choices: [{ delta: { content: 'world!' } }] };
      }
    };
    
    mockOpenAI.chat.completions.create.mockResolvedValue(mockStream as any);

    const result = await provider.generateChatCompletion('test', [], { stream: true });
    
    expect(result).toBe('Hello world!');
  });
});