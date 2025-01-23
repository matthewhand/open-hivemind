import { ILlmProvider } from '../../../src/llm/interfaces/ILlmProvider';

describe('ILlmProvider', () => {
  it('should define the necessary methods', () => {
    const provider: ILlmProvider = {
      generateCompletion: jest.fn(),
      supportsChatCompletion: jest.fn().mockReturnValue(true),
      supportsCompletion: jest.fn().mockReturnValue(true),
      generateChatCompletion: jest.fn().mockResolvedValue('mock chat completion'),
      // Add other methods if necessary
    };

    expect(provider.generateCompletion).toBeDefined();
    // Add other method checks if necessary
  });

  // Add more tests as necessary
});