import { generateChatCompletion } from '@src/llm/llm/generateChatCompletion';
import axios from 'axios';

jest.mock('axios');

describe('generateChatCompletion', () => {
  const mockMessages: any[] = [
    { getText: () => 'Previous message', role: 'user', data: {} },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send completions for given messages', async () => {
    const mockResponse = {
      data: {
        choices: [{ message: { content: 'Hello back!' } }],
      },
    };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await generateChatCompletion('Hello, Grok!', mockMessages, { test: 'metadata' });

    expect(axios.post).toHaveBeenCalledWith(
      'https://open-swarm.fly.dev/v1/chat/completions',
      expect.objectContaining({
        model: 'university',
        messages: expect.arrayContaining([
          { role: 'system', content: 'You are a bot that assists Slack users.' },
          expect.objectContaining({ role: 'assistant', tool_calls: expect.any(Array) }),
          expect.objectContaining({ role: 'tool', content: JSON.stringify({ test: 'metadata' }) }),
          { role: 'user', content: 'Previous message' },
          { role: 'user', content: 'Hello, Grok!' },
        ]),
      }),
      expect.any(Object)
    );
    expect(result).toBe('Hello back!');
  });
});
