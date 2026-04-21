import { toolAugmentedCompletion } from '../../../src/services/toolAugmentedCompletion';
import { ToolManager } from '../../../src/services/ToolManager';
import { IMessage } from '../../../src/message/interfaces/IMessage';

// Mock openai
const mockCreate = jest.fn();
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

// Mock openaiConfig
jest.mock('../../../src/config/openaiConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockReturnValue(undefined),
  },
}));

// Extended IMessage class for testing
class TestMessage extends IMessage {
  constructor(text: string) {
    super({}, 'user');
    this.content = text;
    this.channelId = 'ch-1';
    this.platform = 'test';
  }
  getMessageId() { return 'm1'; }
  getText() { return this.content; }
  getTimestamp() { return new Date(); }
  getChannelId() { return 'ch-1'; }
  getAuthorId() { return 'u1'; }
}

describe('Tool Augmented Completion Integration', () => {
  let mockToolManager: any;

  beforeAll(() => {
    // We mock ToolManager partially to return our test tools
    mockToolManager = {
      getToolsForBot: jest.fn().mockResolvedValue([
        {
          id: 'test-tool-1',
          name: 'get_weather',
          description: 'Get weather for a location',
          inputSchema: {
            type: 'object',
            properties: { location: { type: 'string' } },
            required: ['location']
          },
          execute: jest.fn().mockResolvedValue('Sunny and 75F')
        }
      ]),
      formatToolsForLLM: jest.fn().mockReturnValue([
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get weather for a location',
            parameters: { type: 'object', properties: { location: { type: 'string' } } }
          }
        }
      ]),
      executeTool: jest.fn().mockResolvedValue({
        toolName: 'get_weather',
        success: true,
        result: 'Sunny and 75F'
      }),
      getMaxToolCalls: jest.fn().mockReturnValue(3),
    };

    jest.spyOn(ToolManager, 'getInstance').mockReturnValue(mockToolManager);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should format tools and call the LLM, passing tool outputs back', async () => {
    // Mock the OpenAI response loop
    mockCreate
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Let me check the weather...',
            tool_calls: [{
              id: 'call_123',
              type: 'function',
              function: { name: 'get_weather', arguments: '{"location":"New York"}' }
            }]
          }
        }]
      })
      .mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'The weather in New York is Sunny and 75F.',
            tool_calls: []
          }
        }]
      });

    const message = new TestMessage('What is the weather in New York?');

    const finalResponse = await toolAugmentedCompletion({
      llmProvider: {}, // Not used by the tool flow when tools are present
      botName: 'test-bot',
      userMessage: message as any,
      systemPrompt: 'You are a helpful assistant',
      historyMessages: [],
      metadata: {}
    });

    // The tool augmented wrapper handles the multiple rounds
    expect(finalResponse).toBe('The weather in New York is Sunny and 75F.');
    
    // Verify the LLM was called twice (once for initial, once after tool result)
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // Verify ToolManager was asked to format tools
    expect(mockToolManager.getToolsForBot).toHaveBeenCalledWith('test-bot');
    expect(mockToolManager.executeTool).toHaveBeenCalledWith('test-bot', 'get_weather', { location: 'New York' }, undefined);
  });
});
