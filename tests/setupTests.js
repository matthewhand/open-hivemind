// Mock logger globally
jest.mock('@src/utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

// Mock logger globally
jest.mock('@src/utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

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