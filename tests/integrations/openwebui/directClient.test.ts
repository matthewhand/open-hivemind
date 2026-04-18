import { http } from '@hivemind/shared-types';
import { generateChatCompletionDirect } from '@hivemind/llm-openwebui/directClient';

jest.mock('@hivemind/shared-types', () => {
  const original = jest.requireActual('@hivemind/shared-types');
  return {
    ...original,
    http: {
      create: jest.fn(),
    },
  };
});

const mockedHttp = http as jest.Mocked<typeof http>;

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
    const post = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'ok response' } }],
    });
    mockedHttp.create.mockReturnValue({ post } as any);

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
    expect(mockedHttp.create).toHaveBeenCalledWith(
      'http://localhost:3000/api',
      {
        'Content-Type': 'application/json',
        Authorization: 'Bearer abc',
      }
    );
    expect(post).toHaveBeenCalledWith(
      '/chat/completions',
      {
        model: 'llama3.2',
        messages: [
          { role: 'system', content: 'system prompt' },
          { role: 'assistant', content: 'prev-1' },
          { role: 'user', content: 'hello' },
        ],
      }
    );
  });
});
