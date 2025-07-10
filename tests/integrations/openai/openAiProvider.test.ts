import { openAiProvider } from '@integrations/openai/openAiProvider';
import openaiConfig from '@config/openaiConfig';
import { OpenAI } from 'openai';
import { IMessage } from '@message/interfaces/IMessage';

// Mock the entire 'openai' library
jest.mock('openai');
// Mock the config
jest.mock('@config/openaiConfig');

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockedConfig = openaiConfig as jest.Mocked<typeof openaiConfig>;

describe('openAiProvider', () => {
  let mockChatCreate: jest.Mock;
  let mockCompletionsCreate: jest.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup mock for chat completions
    mockChatCreate = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'mocked chat response' } }],
    });
    // Setup mock for legacy completions
    mockCompletionsCreate = jest.fn().mockResolvedValue({
      choices: [{ text: 'mocked legacy response' }],
    });

    // Make the OpenAI constructor return an object with the mocked methods
    MockedOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockChatCreate,
        },
      },
      completions: {
        create: mockCompletionsCreate,
      },
    } as any));

    // Mock config values
    (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
      const config: { [key: string]: any } = {
        'OPENAI_API_KEY': 'test_api_key',
        'OPENAI_BASE_URL': 'https://api.openai.com/v1',
        'OPENAI_TIMEOUT': 10000,
        'OPENAI_MODEL': 'gpt-test',
        'OPENAI_SYSTEM_PROMPT': 'You are a test assistant.',
        'OPENAI_MAX_TOKENS': 50,
      };
      return config[key];
    });
  });

  it('supportsChatCompletion returns true', () => {
    expect(openAiProvider.supportsChatCompletion()).toBe(true);
  });

  it('supportsCompletion returns true', () => {
    expect(openAiProvider.supportsCompletion()).toBe(true);
  });

  it('generateCompletion returns a string', async () => {
    const response = await openAiProvider.generateCompletion('test prompt');
    expect(typeof response).toBe('string');
    expect(response).toBe('mocked legacy response');
    expect(mockCompletionsCreate).toHaveBeenCalledTimes(1);
  });

  it('generateChatCompletion returns a string', async () => {
    const response = await openAiProvider.generateChatCompletion('test message', []);
    expect(typeof response).toBe('string');
    expect(response).toBe('mocked chat response');
    expect(mockChatCreate).toHaveBeenCalledTimes(1);
  });
});
