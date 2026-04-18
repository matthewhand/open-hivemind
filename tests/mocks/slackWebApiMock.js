class WebClient {
  constructor() {
    this.chat = { 
      postMessage: jest.fn().mockResolvedValue({ ok: true, ts: '123' }) 
    };
    this.conversations = { 
      history: jest.fn().mockResolvedValue({ ok: true, messages: [] }),
      list: jest.fn().mockResolvedValue({ ok: true, channels: [] }),
      join: jest.fn().mockResolvedValue({ ok: true }),
    };
    this.users = { 
      info: jest.fn().mockResolvedValue({ ok: true, user: { id: 'U123', name: 'testuser' } }) 
    };
    this.auth = {
      test: jest.fn().mockResolvedValue({ ok: true, user_id: 'U123', bot_id: 'B123' })
    };
  }
}
module.exports = { WebClient };
