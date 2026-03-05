module.exports = {
  WebClient: jest.fn().mockImplementation(() => ({
    chat: { postMessage: jest.fn() },
    auth: { test: jest.fn() },
    files: { list: jest.fn(), get: jest.fn() },
  })),
};
