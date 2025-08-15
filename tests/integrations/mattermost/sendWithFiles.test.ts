import EventEmitter from 'events';

describe('MattermostService send with files', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('uploads files and includes file_ids in createPost', async () => {
    const mod = await import('../../../src/integrations/mattermost/MattermostService');
    const MattermostService: any = mod.default ?? (mod as any).MattermostService ?? mod;
    const svc: any = MattermostService.getInstance();

    const emitter = new EventEmitter();
    const created: { channelId?: string; text?: string; rootId?: string; fileIds?: string[] } = {} as any;
    const mockClient = {
      on: emitter.on.bind(emitter),
      emit: emitter.emit.bind(emitter),
      connect: async () => {},
      getSelfUser: async () => ({ id: 'botid', username: 'botname' }),
      uploadFiles: async (_channel: string, _files: any[]) => ['fid1', 'fid2'],
      createPost: async (channelId: string, text: string, rootId?: string, fileIds?: string[]) => {
        created.channelId = channelId;
        created.text = text;
        created.rootId = rootId;
        created.fileIds = fileIds;
        return 'post-id-123';
      },
      getChannelPosts: async () => [],
    };

    (svc as any).clients = new Map([['Bot#1', mockClient]]);
    (svc as any).channels = new Map([['Bot#1', 'chan1']]);
    (svc as any).botConfigs = new Map([['Bot#1', { name: 'Bot#1' }]]);

    await svc.initialize();

    const files = [
      { filename: 'a.txt', content: 'aaa', mime: 'text/plain' },
      { filename: 'b.bin', content: Buffer.from([1, 2, 3]) },
    ];
    const id = await svc.sendMessageToChannel('chan1', 'hello', 'Bot#1', 'thread-xyz', files);
    expect(id).toBe('post-id-123');
    expect(created.channelId).toBe('chan1');
    expect(created.text).toBe('hello');
    expect(created.rootId).toBe('thread-xyz');
    expect(created.fileIds).toEqual(['fid1', 'fid2']);
  });
});

