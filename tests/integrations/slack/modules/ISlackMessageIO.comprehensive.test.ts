import { SlackMessageIO } from '@src/integrations/slack/modules/ISlackMessageIO';

jest.mock('@slack/web-api');

describe('SlackMessageIO Comprehensive', () => {
  let messageIO: SlackMessageIO;
  let mockWebClient: any;

  beforeEach(() => {
    mockWebClient = {
      chat: {
        postMessage: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      conversations: {
        history: jest.fn(),
        info: jest.fn()
      },
      users: {
        info: jest.fn()
      }
    };

    messageIO = new SlackMessageIO(mockWebClient, 'test-bot');
  });

  it('should send message successfully', async () => {
    mockWebClient.chat.postMessage.mockResolvedValue({
      ok: true,
      ts: '1234567890.123456'
    });

    const result = await messageIO.sendMessage('C123', 'Hello world');

    expect(result).toBe('1234567890.123456');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
      channel: 'C123',
      text: 'Hello world'
    });
  });

  it('should handle rate limiting', async () => {
    const rateLimitError = new Error('Rate limited');
    (rateLimitError as any).data = { error: 'rate_limited' };

    mockWebClient.chat.postMessage
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ ok: true, ts: '1234567890.123456' });

    const result = await messageIO.sendMessage('C123', 'Test');

    expect(result).toBe('1234567890.123456');
    expect(mockWebClient.chat.postMessage).toHaveBeenCalledTimes(2);
  });

  it('should fetch message history', async () => {
    const mockMessages = [
      { ts: '1234567890.123456', text: 'Message 1', user: 'U123' },
      { ts: '1234567890.123457', text: 'Message 2', user: 'U456' }
    ];

    mockWebClient.conversations.history.mockResolvedValue({
      ok: true,
      messages: mockMessages
    });

    const result = await messageIO.fetchMessages('C123', 10);

    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('Message 1');
  });

  it('should handle message formatting', async () => {
    mockWebClient.chat.postMessage.mockResolvedValue({
      ok: true,
      ts: '1234567890.123456'
    });

    await messageIO.sendMessage('C123', 'Hello <@U123>!');

    expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
      channel: 'C123',
      text: 'Hello <@U123>!'
    });
  });

  it('should handle message updates', async () => {
    mockWebClient.chat.update.mockResolvedValue({
      ok: true,
      ts: '1234567890.123456'
    });

    const result = await messageIO.updateMessage('C123', '1234567890.123456', 'Updated text');

    expect(result).toBe('1234567890.123456');
  });

  it('should handle message deletion', async () => {
    mockWebClient.chat.delete.mockResolvedValue({ ok: true });

    await messageIO.deleteMessage('C123', '1234567890.123456');

    expect(mockWebClient.chat.delete).toHaveBeenCalledWith({
      channel: 'C123',
      ts: '1234567890.123456'
    });
  });

  it('should handle API errors gracefully', async () => {
    mockWebClient.chat.postMessage.mockRejectedValue(new Error('API Error'));

    const result = await messageIO.sendMessage('C123', 'Test');

    expect(result).toBe('');
  });

  it('should validate channel IDs', async () => {
    const result = await messageIO.sendMessage('', 'Test');

    expect(result).toBe('');
    expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
  });

  it('should handle empty messages', async () => {
    const result = await messageIO.sendMessage('C123', '');

    expect(result).toBe('');
    expect(mockWebClient.chat.postMessage).not.toHaveBeenCalled();
  });

  it('should format user mentions correctly', () => {
    const formatted = messageIO.formatUserMention('U123');
    expect(formatted).toBe('<@U123>');
  });

  it('should format channel mentions correctly', () => {
    const formatted = messageIO.formatChannelMention('C123');
    expect(formatted).toBe('<#C123>');
  });
});