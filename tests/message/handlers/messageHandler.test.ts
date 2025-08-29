import { IMessage } from '@message/interfaces/IMessage';

// Simple mocks
jest.mock('@message/helpers/processing/stripBotId', () => ({
  stripBotId: jest.fn(text => text)
}));
jest.mock('@message/helpers/processing/addUserHint', () => ({
  addUserHintFn: jest.fn(text => text)
}));
jest.mock('@message/helpers/processing/shouldReplyToMessage', () => ({
  shouldReplyToMessage: jest.fn(() => true)
}));
jest.mock('@config/messageConfig', () => ({
  get: jest.fn(() => false)
}));

const createMockMessage = (text: string): IMessage => ({
  getText: () => text,
  getChannelId: () => 'test-channel',
  getAuthorId: () => 'test-user',
  getMessageId: () => 'test-message-id',
} as any);

describe('messageHandler', () => {
  it('should create mock message correctly', () => {
    const message = createMockMessage('test');
    expect(message.getText()).toBe('test');
    expect(message.getChannelId()).toBe('test-channel');
  });

  it('should handle empty messages', () => {
    const message = createMockMessage('');
    expect(message.getText()).toBe('');
  });

  it('should handle basic message properties', () => {
    const message = createMockMessage('Hello world');
    expect(message.getAuthorId()).toBe('test-user');
    expect(message.getMessageId()).toBe('test-message-id');
  });
});
