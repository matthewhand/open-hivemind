import { createChatCompletion } from './createChatCompletion';
import { IMessage } from '@src/message/interfaces/IMessage';

// Mock class that extends IMessage for testing
class MockMessage extends IMessage {
    getMessageId() {
        return '12345';
    }
    getText() {
        return 'Test message';
    }
    getAuthorName() {
        return 'TestUser';
    }
    isFromBot() {
        return false;
    }
    getChannelId() {
        return '67890';
    }
    getAuthorId() {
        return '54321';
    }
}

// Test case for createChatCompletion

test('should process messages with getMessageId method', () => {
    const mockMessage = new MockMessage();
    const messages = [mockMessage];
    const result = createChatCompletion(messages);
    expect(result).toBeDefined();
});
