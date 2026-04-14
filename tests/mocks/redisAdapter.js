// Mock for @socket.io/redis-adapter (package not installed in dev environment)
module.exports = {
  createAdapter: jest.fn(() => ({})),
};
