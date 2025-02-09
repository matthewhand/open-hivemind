class WebClient {
  constructor(token) {
    this.token = token;
    this.chat = {
      postMessage: async (params) => {
        return { ts: 'dummy-ts' };
      },
      delete: async (params) => {
        return { ok: true };
      },
    };
  }

  async authTest() {
    return { user_id: 'dummy-user-id', user: 'dummy-user' };
  }

  get conversations() {
    return {
      history: async ({ channel, limit }) => {
        return { messages: [{ text: 'dummy message', channel }] };
      },
      join: async ({ channel }) => {
        return { ok: true };
      }
    };
  }
}

module.exports = { WebClient };