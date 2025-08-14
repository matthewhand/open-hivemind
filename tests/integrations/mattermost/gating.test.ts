import EventEmitter from 'events';

describe('MattermostService gating', () => {
  const OLD_ENV = process.env;
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.MESSAGE_ONLY_WHEN_SPOKEN_TO = 'true';
    process.env.MESSAGE_WAKEWORDS = '!ping,!help';
  });
  afterAll(() => {
    process.env = OLD_ENV;
  });

  function makePost(text: string, user = 'user123') {
    return {
      id: 'post1',
      message: text,
      channel_id: 'chan1',
      user_id: user,
      create_at: Date.now(),
      props: {},
    };
  }

  it('requires wakeword or mention when only-when-spoken is true', async () => {
    const mod = await import('../../../src/integrations/mattermost/MattermostService');
    const MattermostService: any = mod.default ?? (mod as any).MattermostService ?? mod;
    const svc: any = MattermostService.getInstance();

    // Inject mock client with EventEmitter behavior
    const emitter = new EventEmitter();
    const mockClient = {
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
      connect: async () => {},
      getSelfUser: async () => ({ id: 'botid', username: 'botname' }),
      getChannelPosts: async () => [],
      sendTyping: async () => {},
    };

    (svc as any).clients = new Map([['Bot#1', mockClient]]);
    (svc as any).channels = new Map([['Bot#1', 'chan1']]);
    (svc as any).botConfigs = new Map([['Bot#1', { name: 'Bot#1' }]]);
    (svc as any).joinTs = new Map([['Bot#1', Date.now() - 1000]]);
    (svc as any).selfIds = new Map([['Bot#1', 'botid']]);
    (svc as any).selfUsernames = new Map([['Bot#1', 'botname']]);

    await svc.initialize();

    const handler = jest.fn(async () => 'ok');
    svc.setMessageHandler(handler);

    // No wakeword/mention => should not call
    emitter.emit('posted', makePost('hello there'));
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).not.toHaveBeenCalled();

    // Wakeword triggers
    emitter.emit('posted', makePost('!ping status?'));
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledTimes(1);

    // Mention triggers
    emitter.emit('posted', makePost('hey @botname can you help?'));
    await new Promise((r) => setTimeout(r, 10));
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

