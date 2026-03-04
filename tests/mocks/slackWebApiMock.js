module.exports = {
  WebClient: jest.fn().mockImplementation(() => {
    return {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true })
      },
      conversations: {
        info: jest.fn().mockResolvedValue({ ok: true, channel: { id: "C123" } })
      },
      users: {
        info: jest.fn().mockResolvedValue({ ok: true, user: { id: "U123" } })
      }
    };
  })
};
