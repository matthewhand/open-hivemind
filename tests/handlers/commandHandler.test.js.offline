// Adjust the path to commandHandler and commands directory based on your project structure
const { commandHandler } = require('../../src/handlers/commandHandler');
// Mock the entire commands module
jest.mock('../../src/commands/inline', () => ({
  oai: {
    execute: jest.fn().mockResolvedValue(true),
  },
  // Mock other commands if necessary
}));

describe('commandHandler Tests', () => {
  let mockMessage;

  beforeEach(() => {
    mockMessage = {
      content: '',
      reply: jest.fn().mockResolvedValue(null),
      author: { bot: false },
      channel: { send: jest.fn().mockResolvedValue(null) },
    };
  });

  it('executes oai command successfully', async () => {
    mockMessage.content = '!oai test query';
    await commandHandler(mockMessage);
    // Access the mocked commands module and verify the execute method was called
    const commands = require('../../src/commands/inline'); // Ensure this path matches the jest.mock path above
    expect(commands.oai.execute).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
