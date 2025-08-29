import { ILlmProvider } from '../../../src/llm/interfaces/ILlmProvider';
import { IMessage } from '../../../src/message/interfaces/IMessage';

describe('ILlmProvider', () => {
  let mockProvider: ILlmProvider;
  let mockMessage: IMessage;

  beforeEach(() => {
    mockMessage = {
      getText: () => 'test message',
      getMessageId: () => 'msg-123',
      getChannelId: () => 'channel-123',
      getAuthorId: () => 'user-123',
      role: 'user'
    } as any;

    mockProvider = {
      generateCompletion: jest.fn().mockResolvedValue('completion response'),
      supportsChatCompletion: jest.fn().mockReturnValue(true),
      supportsCompletion: jest.fn().mockReturnValue(true),
      generateChatCompletion: jest.fn().mockResolvedValue('chat completion response'),
    };
  });

  it('should define all required methods', () => {
    expect(mockProvider.generateCompletion).toBeDefined();
    expect(mockProvider.supportsChatCompletion).toBeDefined();
    expect(mockProvider.supportsCompletion).toBeDefined();
    expect(mockProvider.generateChatCompletion).toBeDefined();
    
    expect(typeof mockProvider.generateCompletion).toBe('function');
    expect(typeof mockProvider.supportsChatCompletion).toBe('function');
    expect(typeof mockProvider.supportsCompletion).toBe('function');
    expect(typeof mockProvider.generateChatCompletion).toBe('function');
  });

  it('should support completion generation', async () => {
    const result = await mockProvider.generateCompletion('test prompt');
    expect(result).toBe('completion response');
    expect(mockProvider.generateCompletion).toHaveBeenCalledWith('test prompt');
  });

  it('should support chat completion generation', async () => {
    const result = await mockProvider.generateChatCompletion('test message', [mockMessage]);
    expect(result).toBe('chat completion response');
    expect(mockProvider.generateChatCompletion).toHaveBeenCalledWith('test message', [mockMessage]);
  });

  it('should report capability support correctly', () => {
    expect(mockProvider.supportsChatCompletion()).toBe(true);
    expect(mockProvider.supportsCompletion()).toBe(true);
  });

  it('should handle different capability configurations', () => {
    const chatOnlyProvider: ILlmProvider = {
      generateCompletion: jest.fn(),
      supportsChatCompletion: jest.fn().mockReturnValue(true),
      supportsCompletion: jest.fn().mockReturnValue(false),
      generateChatCompletion: jest.fn().mockResolvedValue('chat only'),
    };

    expect(chatOnlyProvider.supportsChatCompletion()).toBe(true);
    expect(chatOnlyProvider.supportsCompletion()).toBe(false);
  });

  it('should handle metadata in chat completion', async () => {
    const metadata = { channelId: 'test-channel', userId: 'test-user' };
    await mockProvider.generateChatCompletion('test', [], metadata);
    
    expect(mockProvider.generateChatCompletion).toHaveBeenCalledWith('test', [], metadata);
  });

  it('should handle empty message history', async () => {
    await mockProvider.generateChatCompletion('test message', []);
    
    expect(mockProvider.generateChatCompletion).toHaveBeenCalledWith('test message', []);
  });

  it('should handle provider errors gracefully', async () => {
    const errorProvider: ILlmProvider = {
      generateCompletion: jest.fn().mockRejectedValue(new Error('API Error')),
      supportsChatCompletion: jest.fn().mockReturnValue(true),
      supportsCompletion: jest.fn().mockReturnValue(true),
      generateChatCompletion: jest.fn().mockRejectedValue(new Error('Chat API Error')),
    };

    await expect(errorProvider.generateCompletion('test')).rejects.toThrow('API Error');
    await expect(errorProvider.generateChatCompletion('test', [])).rejects.toThrow('Chat API Error');
  });
});