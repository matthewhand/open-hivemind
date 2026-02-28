class SocketModeClient {
  constructor(options) {
    this.options = options;
  }
  on(event, callback) {
    // no-op: simulate event listener setup for tests
  }
  async start() {
    // no-op: simulate socket client starting
  }
}

module.exports = { SocketModeClient };