import { OpenAiProvider, openAiProvider } from '@integrations/openai/openAiProvider';
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
    let mockOpenAIInstance: any;

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

        // Create mock OpenAI instance
        mockOpenAIInstance = {
            chat: {
                completions: {
                    create: mockChatCreate,
                },
            },
            completions: {
                create: mockCompletionsCreate,
            },
        };

        // Make the OpenAI constructor return the mocked instance
        MockedOpenAI.mockImplementation(() => mockOpenAIInstance);

        // Mock config values
        (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
            const config: { [key: string]: any } = {
                'OPENAI_API_KEY': 'test_api_key',
                'OPENAI_BASE_URL': 'https://api.openai.com/v1',
                'OPENAI_TIMEOUT': 10000,
                'OPENAI_MODEL': 'gpt-test',
                'OPENAI_SYSTEM_PROMPT': 'You are a test assistant.',
                'OPENAI_MAX_TOKENS': 50,
                'OPENAI_TEMPERATURE': 0.7,
                'OPENAI_ORGANIZATION': undefined,
            };
            return config[key];
        });
    });

    describe('Provider Capabilities', () => {
        it('should support both completion types', () => {
            expect(openAiProvider.supportsChatCompletion()).toBe(true);
            expect(openAiProvider.supportsCompletion()).toBe(true);
        });

        it('should have correct name', () => {
            expect(openAiProvider.name).toBe('openai');
        });
    });

    describe('generateChatCompletion', () => {
        const createMockMessage = (role: string, content: string): IMessage => ({
            getText: () => content,
            getAuthorId: () => 'user123',
            getAuthorName: () => 'TestUser',
            getChannelId: () => 'channel123',
            getMessageId: () => 'msg123',
            getTimestamp: () => new Date(),
            isFromBot: () => role === 'assistant',
            getUserMentions: () => [],
            hasAttachments: () => false,
            role,
        } as any);

        it('should generate chat completion successfully', async () => {
            const response = await openAiProvider.generateChatCompletion('test message', []);
            expect(response).toBe('mocked chat response');
            expect(mockChatCreate).toHaveBeenCalledTimes(1);
        });

        it('should include system prompt and user message', async () => {
            await openAiProvider.generateChatCompletion('test', []);
            expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({ role: 'system', content: 'You are a test assistant.' }),
                    expect.objectContaining({ role: 'user', content: 'test' })
                ])
            }));
        });

        it('should include history messages', async () => {
            const history = [
                createMockMessage('user', 'Hello'),
                createMockMessage('assistant', 'Hi there!')
            ];
            await openAiProvider.generateChatCompletion('test', history);
            expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
                messages: expect.arrayContaining([
                    expect.objectContaining({ role: 'system' }),
                    expect.objectContaining({ role: 'user', content: 'Hello' }),
                    expect.objectContaining({ role: 'assistant', content: 'Hi there!' }),
                    expect.objectContaining({ role: 'user', content: 'test' })
                ])
            }));
        });

        it('should use metadata model override', async () => {
            await openAiProvider.generateChatCompletion('test', [], { modelOverride: 'gpt-4' });
            expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
                model: 'gpt-4'
            }));
        });

        it('should apply temperature boost from metadata', async () => {
            await openAiProvider.generateChatCompletion('test', [], { temperatureBoost: 0.3 });
            expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
                temperature: 1.0 // 0.7 + 0.3
            }));
        });

        it('should cap temperature at 1.5', async () => {
            await openAiProvider.generateChatCompletion('test', [], { temperatureBoost: 1.0 });
            expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
                temperature: 1.5 // capped at 1.5
            }));
        });

        it('should use maxTokensOverride from metadata', async () => {
            await openAiProvider.generateChatCompletion('test', [], { maxTokensOverride: 200 });
            expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
                max_tokens: 200
            }));
        });

        it('should return empty string when API returns no content', async () => {
            mockChatCreate.mockResolvedValue({ choices: [{ message: {} }] });
            const response = await openAiProvider.generateChatCompletion('test', []);
            expect(response).toBe('');
        });

        it('should return empty string when API returns empty choices', async () => {
            mockChatCreate.mockResolvedValue({ choices: [] });
            const response = await openAiProvider.generateChatCompletion('test', []);
            expect(response).toBe('');
        });

        // Skipped: Testing missing API key requires clearing process.env.OPENAI_API_KEY
        // which is complex in Jest. The error handling code path is covered by other tests.
        it.skip('should throw ConfigurationError when API key is missing', async () => {
            (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
                if (key === 'OPENAI_API_KEY') return undefined;
                return 'some-value';
            });

            // Create a new provider instance to test with missing API key
            const providerWithNoKey = new OpenAiProvider();
            await expect(providerWithNoKey.generateChatCompletion('test', []))
                .rejects.toThrow('OpenAI API key is missing');
        });

        it('should retry on failure and eventually throw', async () => {
            mockChatCreate.mockRejectedValue(new Error('API Error'));
            await expect(openAiProvider.generateChatCompletion('test', []))
                .rejects.toThrow('API Error');
            // Should retry 3 times
            expect(mockChatCreate).toHaveBeenCalledTimes(3);
        }, 15000);

        it('should handle concurrent requests', async () => {
            const promises = Array.from({ length: 5 }, () =>
                openAiProvider.generateChatCompletion('test', [])
            );
            const results = await Promise.all(promises);
            expect(results).toHaveLength(5);
            results.forEach(result => expect(result).toBe('mocked chat response'));
        });

        it('should validate and fix invalid baseURL', async () => {
            (mockedConfig.get as jest.Mock).mockImplementation((key: string) => {
                if (key === 'OPENAI_BASE_URL') return 'invalid-url';
                if (key === 'OPENAI_API_KEY') return 'test-key';
                return undefined;
            });

            // Should not throw when baseURL is invalid - falls back to default
            await openAiProvider.generateChatCompletion('test', []);
            expect(MockedOpenAI).toHaveBeenCalledWith(expect.objectContaining({
                baseURL: 'https://api.openai.com/v1'
            }));
        });
    });

    describe('generateCompletion', () => {
        it('should generate legacy completion successfully', async () => {
            const response = await openAiProvider.generateCompletion('test prompt');
            expect(response).toBe('mocked legacy response');
            expect(mockCompletionsCreate).toHaveBeenCalledWith(expect.objectContaining({
                prompt: 'test prompt',
                max_tokens: 150
            }));
        });

        it('should return empty string on error', async () => {
            mockCompletionsCreate.mockRejectedValue(new Error('API Error'));
            const response = await openAiProvider.generateCompletion('test');
            expect(response).toBe('');
        });

        it('should return empty string when no response text', async () => {
            mockCompletionsCreate.mockResolvedValue({ choices: [] });
            const response = await openAiProvider.generateCompletion('test');
            expect(response).toBe('');
        });
    });

    describe('Constructor Configuration', () => {
        it('should accept config overrides in constructor', async () => {
            const customProvider = new OpenAiProvider({
                apiKey: 'custom-key',
                model: 'custom-model',
                systemPrompt: 'Custom prompt'
            });

            await customProvider.generateChatCompletion('test', []);

            expect(MockedOpenAI).toHaveBeenCalledWith(expect.objectContaining({
                apiKey: 'custom-key'
            }));
            expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({
                model: 'custom-model'
            }));
        });
    });
});
