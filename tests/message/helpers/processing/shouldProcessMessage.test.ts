import { shouldProcessMessage, getMinIntervalMs } from '@message/helpers/processing/shouldProcessMessage';
import { IMessage } from '@message/interfaces/IMessage';

jest.mock('@config/messageConfig', () => ({
  get: jest.fn()
}));

const msgConfigMock = require('@config/messageConfig');

const createMockMessage = (text: string, fromBot = false): IMessage => ({
  getText: () => text,
  isFromBot: () => fromBot,
  getChannelId: () => 'test-channel',
  getAuthorId: () => 'test-user',
  getMessageId: () => 'test-message-id',
} as any);

describe('shouldProcessMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    msgConfigMock.get.mockReturnValue(true); // Default MESSAGE_IGNORE_BOTS = true
  });

  it('should process normal user messages', () => {
    const message = createMockMessage('Hello world', false);
    expect(shouldProcessMessage(message)).toBe(true);
  });

  it('should ignore bot messages when MESSAGE_IGNORE_BOTS is true', () => {
    msgConfigMock.get.mockReturnValue(true);
    const message = createMockMessage('Bot message', true);
    expect(shouldProcessMessage(message)).toBe(false);
  });

  it('should process bot messages when MESSAGE_IGNORE_BOTS is false', () => {
    msgConfigMock.get.mockReturnValue(false);
    const message = createMockMessage('Bot message', true);
    expect(shouldProcessMessage(message)).toBe(true);
  });

  it('should ignore empty messages', () => {
    const message = createMockMessage('', false);
    expect(shouldProcessMessage(message)).toBe(false);
  });

  it('should ignore whitespace-only messages', () => {
    const message = createMockMessage('   \n\t  ', false);
    expect(shouldProcessMessage(message)).toBe(false);
  });
});

describe('getMinIntervalMs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return MESSAGE_MIN_INTERVAL_MS when set', () => {
    msgConfigMock.get.mockReturnValue(2000);
    expect(getMinIntervalMs()).toBe(2000);
  });

  it('should return 1000 as default when MESSAGE_MIN_INTERVAL_MS is not set', () => {
    msgConfigMock.get.mockReturnValue(undefined);
    expect(getMinIntervalMs()).toBe(1000);
  });

  it('should handle zero value', () => {
    msgConfigMock.get.mockReturnValue(0);
    expect(getMinIntervalMs()).toBe(0);
  });
});
