module.exports = {
  RTMClient: jest.fn().mockImplementation(() => {
    return {
      start: jest.fn().mockResolvedValue({}),
      on: jest.fn(),
      disconnect: jest.fn(),
      sendMessage: jest.fn().mockResolvedValue({}),
      subscribe: jest.fn()
    };
  })
};
