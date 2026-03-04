const mockWebClient = {
  chat: { postMessage: jest.fn().mockResolvedValue({ ts: '123' }) },
  users: { info: jest.fn().mockResolvedValue({ user: { id: 'U123', name: 'testuser' } }) },
  conversations: { info: jest.fn().mockResolvedValue({ channel: { id: 'C123', name: 'testchannel' } }) }
};
module.exports = {
  WebClient: jest.fn(() => mockWebClient)
};
