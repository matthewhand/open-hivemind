import SlackMessage from '@integrations/slack/SlackMessage';
import { SlackMessageProcessor } from '@integrations/slack/SlackMessageProcessor';

describe('SlackMessageProcessor.enrichSlackMessage', () => {
  let processor: SlackMessageProcessor;
  let webClientMock: any;

  beforeEach(() => {
    webClientMock = {
      auth: { test: jest.fn().mockResolvedValue({ team_id: 'T1', team: 'TeamOne' }) },
      conversations: {
        info: jest.fn().mockResolvedValue({
          ok: true,
          channel: { name: 'gen', purpose: { value: 'desc' }, created: 1630000000 },
        }),
        replies: jest.fn().mockResolvedValue({ messages: [] }),
      },
      files: {
        list: jest.fn().mockResolvedValue({ ok: true, files: [] }),
        info: jest.fn(),
      },
      users: {
        info: jest.fn().mockResolvedValue({
          user: {
            profile: { real_name: 'RealName', email: 'e@e.com' },
            name: 'uname',
            is_admin: false,
            is_owner: false,
          },
        }),
      },
    };
    const managerMock = { getAllBots: jest.fn().mockReturnValue([{ webClient: webClientMock }]) };
    processor = new SlackMessageProcessor(managerMock as any);
  });

  it('throws if message missing channelId', async () => {
    const msg = new SlackMessage('hi', '', {} as any);
    await expect(processor.enrichSlackMessage(msg)).rejects.toThrow(
      'Message and channelId required'
    );
  });

  it('enriches message without thread, attachments, or reactions', async () => {
    const data: any = {};
    const msg = new SlackMessage('hello', 'C1', data);
    const enriched = await processor.enrichSlackMessage(msg);
    expect(enriched.data.metadata.channelInfo.channelId).toBe('C1');
    expect(enriched.data.metadata.userInfo.userName).toBe('User');
    expect(enriched.data.workspaceInfo).toEqual({ workspaceId: 'T1', workspaceName: 'TeamOne' });
    expect(enriched.data.channelInfo.channelName).toBe('gen');
    expect(enriched.data.channelInfo.description).toBe('desc');
    const cd = new Date(1630000000 * 1000).toISOString();
    expect(enriched.data.channelInfo.createdDate).toBe(cd);
    expect(enriched.data.threadInfo.isThread).toBe(false);
    expect(enriched.data.channelContent.content).toBe('');
    expect(enriched.data.messageAttachments).toEqual([]);
    expect(enriched.data.messageReactions).toEqual([]);
    expect(enriched.data.slackUser).toEqual({
      slackUserId: 'unknown',
      userName: 'User',
      email: null,
      preferredName: null,
      isStaff: false,
    });
  });

  it('enriches message with thread and attachments', async () => {
    webClientMock.conversations.replies.mockResolvedValue({
      messages: [{ user: 'U2' }, { user: 'U3' }, { user: 'U2' }],
    });
    webClientMock.files.list.mockResolvedValue({ ok: true, files: [] });
    const data: any = {
      user: 'U1',
      thread_ts: 'TS1',
      files: [{ name: 'f', filetype: 'txt', url_private: 'u', size: 5 }],
      reactions: [{ name: 'like', users: ['U1'] }],
    };
    const msg = new SlackMessage('hey', 'C2', data);
    const enriched = await processor.enrichSlackMessage(msg);
    expect(enriched.data.threadInfo.isThread).toBe(true);
    expect(enriched.data.threadInfo.threadTs).toBe('TS1');
    expect(enriched.data.threadInfo.threadParticipants).toEqual(['U2', 'U3']);
    expect(enriched.data.threadInfo.messageCount).toBe(3);
    expect(enriched.data.messageAttachments).toEqual([
      { id: 9999, fileName: 'f', fileType: 'txt', url: 'u', size: 5 },
    ]);
    expect(enriched.data.messageReactions).toEqual([
      {
        reaction: 'like',
        reactedUserId: 'U1',
        messageId: msg.getMessageId(),
        messageChannelId: 'C2',
      },
    ]);
  });

  it('skips canvas content fetch when SUPPRESS_CANVAS_CONTENT=true', async () => {
    process.env.SUPPRESS_CANVAS_CONTENT = 'true';
    const msg = new SlackMessage('hi', 'C1', {} as any);
    const enriched = await processor.enrichSlackMessage(msg);
    expect(webClientMock.files.list).not.toHaveBeenCalled();
    expect(enriched.data.channelContent.content).toBe('');
    delete process.env.SUPPRESS_CANVAS_CONTENT;
  });

  it('handles files.list error gracefully', async () => {
    const msg = new SlackMessage('hi', 'C1', {} as any);
    webClientMock.files.list.mockRejectedValue(new Error('list error'));
    const enriched = await processor.enrichSlackMessage(msg);
    expect(webClientMock.files.list).toHaveBeenCalled();
    expect(enriched.data.channelContent.content).toBe('');
  });
});
