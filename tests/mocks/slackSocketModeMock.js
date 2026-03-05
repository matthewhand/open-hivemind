const mockSocketModeClient = {
  on: jest.fn(),
  start: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn()
};
module.exports = {
  SocketModeClient: jest.fn(() => mockSocketModeClient)
};
