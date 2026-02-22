import axios from 'axios';
import { generateChatCompletionDirect } from '@hivemind/provider-openwebui/directClient';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const makeMessage = (text: string, role = 'user') =>
  ({ getText: () => text, role } as { getText: () => string; role?: string });

describe('generateChatCompletionDirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when required overrides are missing', async () => {
    await expect(
      generateChatCompletionDirect({ apiUrl: '', model: '' }, 'hello', [])
    ).rejects.toThrow('OpenWebUI overrides require apiUrl and model');
  });

  it('sends request and returns first choice content', async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        choices: [{ message: { content: 'ok response' } }],
      },
    });
    mockedAxios.create.mockReturnValue({ post } as any);

    const result = await generateChatCompletionDirect(
      {
        apiUrl: 'http://localhost:3000/api/',
        authHeader: 'Bearer abc',
        model: 'llama3.2',
      },
      'hello',
      [makeMessage('prev-1', 'assistant') as any],
      'system prompt'
    );

    expect(result).toBe('ok response');
    expect(mockedAxios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer abc',
      },
      timeout: 15000,
    });
    expect(post).toHaveBeenCalledWith('/chat/completions', {
      model: 'llama3.2',
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'assistant', content: 'prev-1' },
        { role: 'user', content: 'hello' },
      ],
    });
  });
});
