module.exports = {
  SocketModeClient: jest.fn().mockImplementation(() => {
    return {
      start: jest.fn().mockResolvedValue({}),
      on: jest.fn(),
      disconnect: jest.fn()
    };
  })
};
