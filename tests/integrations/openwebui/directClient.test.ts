import { http } from '@hivemind/shared-types';
import { generateChatCompletionDirect } from '@integrations/openwebui/directClient';

jest.mock('@hivemind/shared-types', () => ({
  http: {
    create: jest.fn(),
  },
}));

const mockHttp = http as jest.Mocked<typeof http>;

const makeMessage = (text: string, role = 'user') =>
  ({ getText: () => text, role }) as { getText: () => string; role?: string };

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
    const mockPost = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'ok response' } }],
    });
    mockHttp.create.mockReturnValue({ post: mockPost } as any);

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
    expect(mockHttp.create).toHaveBeenCalledWith('http://localhost:3000/api', {
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    });
    expect(mockPost).toHaveBeenCalledWith('/chat/completions', {
      model: 'llama3.2',
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'assistant', content: 'prev-1' },
        { role: 'user', content: 'hello' },
      ],
    });
  });
});
