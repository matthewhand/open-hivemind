const mockRtmClient = {
  on: jest.fn(),
  start: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn(),
  sendMessage: jest.fn().mockResolvedValue({ ts: '123' })
};
module.exports = {
  RTMClient: jest.fn(() => mockRtmClient)
};
