class WebClient {
  constructor() {
    this.chat = { postMessage: jest.fn().mockResolvedValue({ ts: '123' }) };
    this.conversations = { history: jest.fn().mockResolvedValue({ messages: [] }) };
    this.users = { info: jest.fn().mockResolvedValue({ user: { id: 'U123' } }) };
  }
}
module.exports = { WebClient };
