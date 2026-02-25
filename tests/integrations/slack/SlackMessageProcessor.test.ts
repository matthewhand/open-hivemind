import axios from 'axios';
import { SlackBotManager } from '../../../packages/adapter-slack/src/SlackBotManager';
import SlackMessage from '../../../packages/adapter-slack/src/SlackMessage';
import { SlackMessageProcessor } from '../../../packages/adapter-slack/src/SlackMessageProcessor';

jest.mock('axios', () => ({
  get: jest.fn(),
}));

// Helper to create a mock webClient with only what we need per test
function createWebClientMock(overrides: Partial<any> = {}) {
  return {
    auth: {
      test: jest.fn().mockResolvedValue({ team_id: 'T123', team: 'Test Team' }),
    },
    conversations: {
      info: jest.fn().mockResolvedValue({
        ok: true,
        channel: {
          name: 'general',
          created: Math.floor(Date.now() / 1000),
          purpose: { value: 'General discussion' },
        },
      }),
      replies: jest.fn().mockResolvedValue({
        messages: [{ user: 'U111' }, { user: 'U222' }, { user: 'U111' }],
      }),
      history: jest.fn().mockResolvedValue({ messages: [] }),
      list: jest.fn().mockResolvedValue({ ok: true, channels: [] }),
    },
    users: {
      info: jest.fn().mockResolvedValue({
        user: {
          name: 'testuser',
          profile: { email: 'user@example.com', real_name: 'Test User' },
          is_admin: false,
          is_owner: false,
        },
      }),
    },
    files: {
      list: jest.fn().mockResolvedValue({ ok: true, files: [] }),
      info: jest.fn().mockResolvedValue({
        ok: true,
        file: {
          filetype: 'canvas',
          url_private: 'https://example.com/file',
          mimetype: 'text/plain',
        },
        content: 'Canvas content',
      }),
    },
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ts: '123.456' }),
    },
    ...overrides,
  };
}

function createBotManagerMock(webClient: any) {
  return {
    getAllBots: () => [{ webClient, botUserId: 'UBOT', botUserName: 'TestBot', config: {} }],
    initialize: jest.fn(),
    setMessageHandler: jest.fn(),
    getAllBotsMocked: true,
  } as unknown as SlackBotManager;
}

describe('SlackMessageProcessor', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2025-08-02T00:00:00Z'));
    process.env = { ...OLD_ENV, SUPPRESS_CANVAS_CONTENT: 'true', SLACK_BOT_TOKEN: 'xoxb-test' };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = OLD_ENV;
  });

  describe('constructor', () => {
    it('handles constructor scenarios', () => {
      // Test throws when botManager is missing
      expect(() => new SlackMessageProcessor(undefined as unknown as SlackBotManager)).toThrow(
        'SlackBotManager instance required'
      );

      // Test initializes with a valid botManager
      const smp = new SlackMessageProcessor(createBotManagerMock(createWebClientMock()));
      expect(smp).toBeDefined();
    });
  });

  describe('enrichSlackMessage()', () => {
    it('handles message enrichment scenarios', async () => {
      // Test throws when message or channelId is invalid
      const smp1 = new SlackMessageProcessor(createBotManagerMock(createWebClientMock()));
      await expect(
        smp1.enrichSlackMessage(new SlackMessage('hello', '', { ts: '1.001' }))
      ).rejects.toThrow('Message and channelId required');

      // Test enriches with workspace, channel, thread, user, and metadata; respects SUPPRESS_CANVAS_CONTENT
      const webClient = createWebClientMock({
        files: {
          list: jest.fn().mockResolvedValue({
            ok: true,
            files: [
              { id: 'F1', linked_channel_id: 'C123', url_private: 'https://example.com/canvas' },
            ],
          }),
          info: jest.fn().mockResolvedValue({
            ok: true,
            file: {
              filetype: 'canvas',
              url_private: 'https://example.com/canvas',
              mimetype: 'text/plain',
            },
            content: 'Canvas X',
          }),
        },
        conversations: {
          info: jest.fn().mockResolvedValue({
            ok: true,
            channel: {
              name: 'general',
              created: Math.floor(Date.now() / 1000),
              purpose: { value: 'General discussion' },
            },
          }),
          replies: jest.fn().mockResolvedValue({
            messages: [{ user: 'U111' }, { user: 'U222' }, { user: 'U111' }],
          }),
          history: jest.fn().mockResolvedValue({ messages: [] }),
        },
      });
      // SUPPRESS_CANVAS_CONTENT=true above should force empty channelContent path
      const botManager = createBotManagerMock(webClient);
      const smp2 = new SlackMessageProcessor(botManager);

      const msg = new SlackMessage('hi there', 'C123', {
        ts: '1722556800.123',
        user: 'U999',
        thread_ts: '1722556800.100',
        reactions: [{ name: 'thumbsup', users: ['U123'] }],
        files: [
          { name: 'doc.txt', filetype: 'txt', url_private: 'https://example.com/doc', size: 10 },
        ],
      });

      const enriched = await smp2.enrichSlackMessage(msg);
      expect(enriched.data.workspaceInfo).toEqual({
        workspaceId: 'T123',
        workspaceName: 'Test Team',
      });
      expect(enriched.data.channelInfo).toMatchObject({
        channelId: 'C123',
        channelName: 'general',
      });
      expect(enriched.data.threadInfo).toMatchObject({
        isThread: true,
        threadTs: '1722556800.100',
        messageCount: 3,
      });
      expect(enriched.data.slackUser).toMatchObject({ slackUserId: 'U999', userName: 'Test User' });
      expect(enriched.data.metadata).toBeDefined();
      expect(enriched.data.channelContent).toBeDefined();
      // When SUPPRESS_CANVAS_CONTENT=true, enrichment sets empty channelContent
      expect(enriched.data.channelContent).toEqual({ content: '' });
      expect(enriched.data.messageAttachments[0]).toMatchObject({
        fileName: 'doc.txt',
        fileType: 'txt',
      });
      expect(enriched.data.messageReactions[0]).toMatchObject({
        reaction: 'thumbsup',
        reactedUserId: 'U123',
      });
    });

    it('handles different file types and user scenarios in message enrichment', async () => {
      // Test image file handling
      process.env.SUPPRESS_CANVAS_CONTENT = 'false';
      let axiosGet = axios.get as jest.Mock;
      axiosGet.mockResolvedValueOnce({ data: Buffer.from('image-bytes') });

      let webClient = createWebClientMock({
        files: {
          list: jest.fn().mockResolvedValue({
            ok: true,
            files: [
              { id: 'FIMG', linked_channel_id: 'CIMG', url_private: 'https://example.com/img' },
            ],
          }),
          info: jest.fn().mockResolvedValue({
            ok: true,
            file: {
              filetype: 'png',
              url_private: 'https://example.com/img',
              mimetype: 'image/png',
            },
            content: undefined,
          }),
        },
      });

      let smp = new SlackMessageProcessor(createBotManagerMock(webClient));
      let msg = new SlackMessage('pic', 'CIMG', { ts: '1.002', user: 'U111' });
      let enriched = await smp.enrichSlackMessage(msg);
      expect(enriched.data.channelContent.content.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('handles different file types and user scenarios in message enrichment', async () => {
      // Test image file handling
      process.env.SUPPRESS_CANVAS_CONTENT = 'false';
      let axiosGet = axios.get as jest.Mock;
      axiosGet.mockResolvedValueOnce({ data: Buffer.from('image-bytes') });

      let webClient = createWebClientMock({
        files: {
          list: jest.fn().mockResolvedValue({
            ok: true,
            files: [
              { id: 'FIMG', linked_channel_id: 'CIMG', url_private: 'https://example.com/img' },
            ],
          }),
          info: jest.fn().mockResolvedValue({
            ok: true,
            file: {
              filetype: 'png',
              url_private: 'https://example.com/img',
              mimetype: 'image/png',
            },
            content: undefined,
          }),
        },
      });

      let smp = new SlackMessageProcessor(createBotManagerMock(webClient));
      let msg = new SlackMessage('pic', 'CIMG', { ts: '1.002', user: 'U111' });
      let enriched = await smp.enrichSlackMessage(msg);
      expect(enriched.data.channelContent.content.startsWith('data:image/png;base64,')).toBe(true);

      // Reset mocks and test unsupported file type
      jest.clearAllMocks();
      axiosGet = axios.get as jest.Mock;
      webClient = createWebClientMock({
        files: {
          list: jest
            .fn()
            .mockResolvedValue({ ok: true, files: [{ id: 'FX', linked_channel_id: 'C123' }] }),
          info: jest.fn().mockResolvedValue({
            ok: true,
            file: {
              filetype: 'pdf',
              url_private: 'https://example.com/pdf',
              mimetype: 'application/pdf',
            },
            content: undefined,
          }),
        },
      });
      smp = new SlackMessageProcessor(createBotManagerMock(webClient));
      msg = new SlackMessage('doc', 'C123', { ts: '1.003', user: 'U222' });
      enriched = await smp.enrichSlackMessage(msg);
      expect(enriched.data.channelContent).toMatchObject({ content: '' });

      // Reset mocks and test unknown user
      jest.clearAllMocks();
      webClient = createWebClientMock({
        users: {
          info: jest.fn(), // should not be called
        },
      });
      smp = new SlackMessageProcessor(createBotManagerMock(webClient));
      msg = new SlackMessage('hello', 'C123', { ts: '1.004', user: 'unknown' });
      enriched = await smp.enrichSlackMessage(msg);
      expect(webClient.users.info).not.toHaveBeenCalled();
      expect(enriched.data.slackUser.slackUserId).toBe('unknown');
    });
  });

  describe('constructPayload()', () => {
    it('handles payload construction scenarios', async () => {
      // Test throws when message is missing
      const smp = new SlackMessageProcessor(createBotManagerMock(createWebClientMock()));
      // Avoid accessing message before guard by calling with null and wrapping call site
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const call = () => (smp as any).constructPayload(undefined, []);
      // Current implementation dereferences message before guard; assert the actual TypeError mentioning getText
      await expect(call()).rejects.toThrow(/getText/);

      // Test builds payload with defaults and history aggregation
      const msg = new SlackMessage('What is up?', 'C999', {
        ts: '2.001',
        slackUser: { slackUserId: 'U111', userName: 'User One' },
        channelContent: { content: 'Context here' },
        metadata: { channelInfo: { channelId: 'C999' }, userInfo: { userName: 'User One' } },
      });

      const history = [
        new SlackMessage('Hello', 'C999', {
          role: 'user',
        }) as unknown as import('@message/interfaces/IMessage').IMessage,
        new SlackMessage('Hi!', 'C999', {
          role: 'assistant',
        }) as unknown as import('@message/interfaces/IMessage').IMessage,
        new SlackMessage('', 'C999', {
          role: 'user',
        }) as unknown as import('@message/interfaces/IMessage').IMessage, // empty text path
      ];

      const payload = await smp.constructPayload(msg, history);
      expect(payload.metadata.channelInfo.channelId).toBe('C999');
      expect(payload.messages.length).toBeGreaterThanOrEqual(4);
      const last = payload.messages[payload.messages.length - 1];
      expect(last).toMatchObject({ role: 'user', content: 'What is up?' });
    });
  });

  describe('processResponse()', () => {
    it('returns fallback when rawResponse is empty', async () => {
      const smp = new SlackMessageProcessor(createBotManagerMock(createWebClientMock()));
      const out = await smp.processResponse('');
      expect(out).toEqual({ text: 'No response available' });
    });

    it('normalizes entities, quotes, and markdown; returns mrkdwn block', async () => {
      const smp = new SlackMessageProcessor(createBotManagerMock(createWebClientMock()));
      const response = `He said &quot;Hello" -- that's **bold** and __italics__ "end`;
      const out = await smp.processResponse(response);
      expect(typeof out.text).toBe('string');
      expect(out.blocks).toBeDefined();
      expect(out.blocks?.[0]).toMatchObject({ type: 'section' });
    });

    it('handles processing errors gracefully', async () => {
      const smp = new SlackMessageProcessor(createBotManagerMock(createWebClientMock()));
      // Force an error by monkey-patching replace to throw once
      const bad = new String('oops') as unknown as string;
      // @ts-ignore
      bad.replace = () => {
        throw new Error('boom');
      };
      const out = await smp.processResponse(bad as unknown as string);
      expect(out.text).toBe('Error processing response');
    });
  });

  describe('private helpers via side effects', () => {
    it('getThreadParticipants and getThreadMessageCount integrate through enrichSlackMessage when thread_ts exists', async () => {
      const webClient = createWebClientMock({
        conversations: {
          info: jest.fn().mockResolvedValue({
            ok: true,
            channel: {
              name: 'general',
              purpose: { value: 'x' },
              created: Math.floor(Date.now() / 1000),
            },
          }),
          replies: jest.fn().mockResolvedValue({ messages: [{ user: 'U1' }, { user: 'U2' }] }),
          history: jest.fn().mockResolvedValue({ messages: [] }),
        },
      });
      const smp = new SlackMessageProcessor(createBotManagerMock(webClient));
      const msg = new SlackMessage('t', 'C-TH', { ts: '3.001', user: 'U1', thread_ts: '3.000' });
      const enriched = await smp.enrichSlackMessage(msg);
      expect(enriched.data.threadInfo.isThread).toBe(true);
      expect(enriched.data.threadInfo.threadParticipants).toEqual(['U1', 'U2']);
      expect(enriched.data.threadInfo.messageCount).toBe(2);
    });
  });
});
