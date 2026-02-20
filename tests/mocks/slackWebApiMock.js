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
    this.auth = {
      test: async () => {
        return { ok: true, user_id: 'dummy-user-id', user: 'dummy-user' };
      }
    };
  }

  get conversations() {
    return {
      history: async ({ channel, limit }) => {
        return { messages: [{ text: 'dummy message', channel }] };
      },
      join: async ({ channel }) => {
        return { ok: true };
      },
      list: async (params) => {
        return { ok: true, channels: [{ id: 'C123', name: 'general' }] };
      },
      info: async (params) => {
        return { ok: true, channel: { id: 'C123', name: 'general' } };
      }
    };
  }
}

module.exports = { WebClient };