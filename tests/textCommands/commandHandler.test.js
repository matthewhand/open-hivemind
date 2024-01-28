// Mocking the handler functions
const mockHandleFlowiseRequest = jest.fn();
const mockHandleImageAnalysis = jest.fn();
// Add more mocks for other handlers as needed

jest.mock('../../src/textCommands/handleFlowiseRequest', () => ({
  handleFlowiseRequest: mockHandleFlowiseRequest,
}));

jest.mock('../../src/textCommands/handleImageAnalysis', () => ({
  handleImageAnalysis: mockHandleImageAnalysis,
}));

const { commandHandler } = require('../../src/textCommands/commandHandler');

describe('commandHandler Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('correctly handles flowise command with action and query', () => {
    // Mock a Discord message object
    const mockMessage = { content: '!flowise:pinecone blue and black?', reply: jest.fn() };

    // Call commandHandler
    commandHandler(mockMessage, mockMessage.content);

    // Check if the correct handler was called with the right arguments
    expect(mockHandleFlowiseRequest).toHaveBeenCalledWith(mockMessage, 'pinecone', 'blue and black?');
  });

  test('correctly handles image command', () => {
    const mockMessage = { content: '!image http://example.com/image.jpg', reply: jest.fn() };
  
    commandHandler(mockMessage, mockMessage.content);
  
    expect(mockHandleImageAnalysis).toHaveBeenCalledWith(mockMessage, undefined, 'http://example.com/image.jpg');
  });
    // Add more tests for different commands and scenarios
});
