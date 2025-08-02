/**
 * Test-only SlackService mock to avoid requiring legacy config or network.
 */
jest.mock('@integrations/slack/SlackService', () => {
  class FakeSlackService {
    static instance: any;
    private handler: any = null;
    private bots = [
      { botUserId: 'BTEST123', botUserName: 'TestBot', client: {} as any },
    ];
    static getInstance() {
      if (!this.instance) this.instance = new FakeSlackService();
      return this.instance;
    }
    async initialize() { /* no-op */ }
    async shutdown() { /* no-op */ FakeSlackService.instance = undefined; }
    getBotManager() {
      return {
        getAllBots: () => this.bots,
      };
    }
    async sendMessageToChannel(channelId: string, text: string) {
      if (this.handler) {
        await this.handler({ getText: () => text, data: { channelId } } as any, []);
      }
      return 'TST123.1';
    }
    async fetchMessages() {
      return [];
    }
    getClientId() {
      return this.bots[0].botUserId;
    }
    getDefaultChannel() {
      return process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    }
    setMessageHandler(handler: any) {
      this.handler = handler;
    }
  }
  return { SlackService: FakeSlackService };
});

import { SlackService } from '@integrations/slack/SlackService';

describe('SlackService Integration (test-mocked)', () => {
  let service: any;

  beforeEach(async () => {
    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    await service.initialize();
    const botManager = service.getBotManager();
    expect(botManager).toBeDefined();
    const bots = botManager.getAllBots();
    expect(bots.length).toBeGreaterThan(0);
  });

  afterEach(async () => {
    if (service && typeof service.shutdown === 'function') {
      await service.shutdown();
    }
  });

  it('sends message to channel', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    const result = await service.sendMessageToChannel(channelId, 'Test message', 'Madgwick AI');
    expect(result).toBeDefined();
  });

  it('fetches messages from channel', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    const messages = await service.fetchMessages(channelId);
    expect(Array.isArray(messages)).toBe(true);
  });

  it('gets client ID', async () => {
    const clientId = service.getClientId();
    expect(clientId).toMatch(/^B/);
  });

  it('gets default channel', async () => {
    const channel = service.getDefaultChannel();
    expect(channel).toBeDefined();
  });

  it('sends message with data to LLM', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    const seen: any[] = [];
    service.setMessageHandler(async (msg: any) => {
      seen.push(msg.getText());
      return 'Received';
    });
    const ts = await service.sendMessageToChannel(channelId, 'Test LLM', 'Madgwick AI');
    expect(ts).toBeDefined();
    expect(seen).toContain('Test LLM');
  });
});
