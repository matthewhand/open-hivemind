import EventEmitter from 'events';

describe('MattermostService join and fetch', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('calls joinChannel on client and fetch maps posts to messages', async () => {
    const mod = await import('../../../src/integrations/mattermost/MattermostService');
    const MattermostService: any = mod.default ?? (mod as any).MattermostService ?? mod;
    const svc: any = MattermostService.getInstance();

    const emitter = new EventEmitter();
    let joined: string | undefined;
    const now = Date.now();
    const mockPosts = [
      { id: 'p1', message: 'one', channel_id: 'chanZ', user_id: 'u1', create_at: now },
      { id: 'p2', message: 'two', channel_id: 'chanZ', user_id: 'u2', create_at: now + 1 },
    ];
    const mockClient = {
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
      connect: async () => {},
      getSelfUser: async () => ({ id: 'botid', username: 'botname' }),
      joinChannel: async (ch: string) => { joined = ch; },
      getChannelPosts: async (_ch: string, _limit: number) => mockPosts,
    };

    (svc as any).clients = new Map([['Bot#1', mockClient]]);
    (svc as any).channels = new Map([['Bot#1', 'chanZ']]);
    (svc as any).botConfigs = new Map([['Bot#1', { name: 'Bot#1' }]]);

    await svc.initialize();

    await svc.joinChannel('chanZ');
    expect(joined).toBe('chanZ');

    const history = await svc.getMessagesFromChannel('chanZ');
    expect(history.length).toBe(2);
    expect(history[0].getText()).toBe('one');
    expect(history[1].getText()).toBe('two');
  });
});

