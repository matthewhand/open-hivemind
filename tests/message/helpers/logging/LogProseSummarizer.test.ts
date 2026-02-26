import { summarizeLogWithLlm } from '../../../../src/message/helpers/logging/LogProseSummarizer';
import { OpenAI } from 'openai';

// Mock OpenAI
jest.mock('openai');

describe('summarizeLogWithLlm', () => {
  const originalEnv = process.env;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Reset env vars before each test
    process.env = { ...originalEnv };

    // Setup mock for OpenAI
    mockCreate = jest.fn();
    (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns original prose if LOG_SUMMARY_LLM is not set', async () => {
    delete process.env.LOG_SUMMARY_LLM;

    const input = 'Bot received a message from user123';
    const result = await summarizeLogWithLlm(input);

    expect(result).toBe(input);
    expect(OpenAI).not.toHaveBeenCalled();
  });

  it('returns original prose if LOG_SUMMARY_LLM is set but OPENAI_API_KEY is missing', async () => {
    process.env.LOG_SUMMARY_LLM = 'gpt-3.5-turbo';
    delete process.env.OPENAI_API_KEY;

    const input = 'Bot received a message from user123';
    const result = await summarizeLogWithLlm(input);

    expect(result).toBe(input);
    expect(OpenAI).not.toHaveBeenCalled();
  });

  it('calls OpenAI and returns rewritten text when configured correctly', async () => {
    process.env.LOG_SUMMARY_LLM = 'gpt-3.5-turbo';
    process.env.OPENAI_API_KEY = 'test-key';

    const input = 'Bot received a message from user123';
    const rewritten = 'User sent msg.';

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: rewritten,
          },
        },
      ],
    });

    const result = await summarizeLogWithLlm(input);

    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-key', baseURL: expect.any(String) });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gpt-3.5-turbo',
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: input })
      ]),
    }));
    expect(result).toBe(rewritten);
  });

  it('returns original prose when OpenAI API fails', async () => {
    process.env.LOG_SUMMARY_LLM = 'gpt-3.5-turbo';
    process.env.OPENAI_API_KEY = 'test-key';

    mockCreate.mockRejectedValue(new Error('API Error'));

    const input = 'Bot received a message from user123';
    const result = await summarizeLogWithLlm(input);

    expect(result).toBe(input);
  });

  it('returns original prose when OpenAI returns empty content', async () => {
    process.env.LOG_SUMMARY_LLM = 'gpt-3.5-turbo';
    process.env.OPENAI_API_KEY = 'test-key';

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: '',
          },
        },
      ],
    });

    const input = 'Bot received a message from user123';
    const result = await summarizeLogWithLlm(input);

    expect(result).toBe(input);
  });

  it('returns original prose when OpenAI returns empty choices array', async () => {
    process.env.LOG_SUMMARY_LLM = 'gpt-3.5-turbo';
    process.env.OPENAI_API_KEY = 'test-key';

    mockCreate.mockResolvedValue({
      choices: [],
    });

    const input = 'Bot received a message from user123';
    const result = await summarizeLogWithLlm(input);

    expect(result).toBe(input);
  });
});
