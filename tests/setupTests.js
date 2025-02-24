// Mock messageConfig globally with dynamic storage
jest.mock('@config/messageConfig', () => {
  const configStore = {};
  return {
    __esModule: true,
    default: {
      get: jest.fn((key) => configStore[key]),
      set: jest.fn((key, value) => {
        configStore[key] = value;
      }),
      loadFile: jest.fn(),
      validate: jest.fn(),
    },
  };
});

// Mock getMessengerProvider globally
jest.mock('@src/message/management/getMessengerProvider', () => ({
  getMessengerProvider: jest.fn(() => [{
    sendMessageToChannel: jest.fn(),
    getClientId: jest.fn().mockReturnValue('bot123'),
  }]),
}));
