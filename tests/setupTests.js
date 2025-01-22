// Mock messageConfig globally
jest.mock('@src/message/interfaces/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    loadFile: jest.fn(),
    validate: jest.fn(),
  },
}));

// Mock getMessageProvider globally
jest.mock('@src/message/management/getMessageProvider', () => ({
  getMessageProvider: jest.fn(() => ({
    sendMessageToChannel: jest.fn(),
    getClientId: jest.fn().mockReturnValue('bot123'),
  })),
}));