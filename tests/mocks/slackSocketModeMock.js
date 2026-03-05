module.exports = {
  SocketModeClient: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn()
  })),
};
