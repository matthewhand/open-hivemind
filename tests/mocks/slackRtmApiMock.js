class RTMClient {
  constructor(token) {
    this.token = token;
  }
  on(event, callback) {
    // no-op: simulate event listener setup for tests
  }
  async start() {
    // no-op: simulate RTM client starting
  }
}

module.exports = { RTMClient };