class SocketModeClient {
  constructor() {
    this.start = jest.fn().mockResolvedValue();
    this.on = jest.fn();
  }
}
module.exports = { SocketModeClient };
