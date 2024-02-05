const { handleOllamaMessage } = require('../../src/commands/inline/ollama');

describe('handleOllamaMessage', () => {
    let mockSend;

    beforeEach(() => {
        mockSend = jest.fn();
    });

    const testFunction = async () => {
        const mockMessage = {
            content: "!ollama What is the meaning of life?",
            channel: { send: mockSend }
        };

        await handleOllamaMessage(mockMessage);

        // Expect that the 'send' method was called at least once
        expect(mockSend).toHaveBeenCalled();
        // Additional checks can be added here
    };

    // Skip the test on Windows
    if (process.platform === "win32") {
        it.skip('should respond to a valid message', testFunction);
    } else {
        it('should respond to a valid message', testFunction);
    }

    // Additional test cases can be added here
});
