class RTMClient {
  constructor() {
    this.start = jest.fn().mockResolvedValue();
    this.on = jest.fn();
    this.sendMessage = jest.fn().mockResolvedValue({ ts: '123' });
  }
}
module.exports = { RTMClient };
