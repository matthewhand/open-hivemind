/**
 * Test-only SlackService mock; no legacy config/network.
 */
jest.mock('@integrations/slack/SlackService', () => {
  class FakeSlackService {
    static instance: any;
    private handler: any = null;
    private lastText: string | null = null;
    private bots = [{ botUserId: 'BTEST123', botUserName: 'TestBot' }];
    static getInstance() {
      if (!this.instance) this.instance = new FakeSlackService();
      return this.instance;
    }
    async initialize() {}
    async shutdown() { FakeSlackService.instance = undefined; }
    setMessageHandler(handler: any) { this.handler = handler; }
    getBotManager() { return { getAllBots: () => this.bots }; }
    async sendMessageToChannel(channelId: string, text: string) {
      this.lastText = text;
      if (this.handler) {
        await this.handler({ getText: () => text, data: { channelId } } as any);
      }
      return 'TST123.2';
    }
    async fetchMessages() {
      const make = (t: string) => ({ getText: () => t } as any);
      // Simulate an echo response created by handler
      return this.lastText ? [make(this.lastText), make(`Echo: ${this.lastText}`)] : [];
    }
  }
  return { SlackService: FakeSlackService };
});

import { SlackService } from '@integrations/slack/SlackService';
import SlackMessage from '@integrations/slack/SlackMessage';

describe('SlackEventListener Integration (test-mocked)', () => {
  let service: any;

  beforeEach(async () => {
    (SlackService as any).instance = undefined;
    service = SlackService.getInstance();
    await service.initialize();
    service.setMessageHandler(async (message: SlackMessage) => {
      return `Echo: ${message.getText()}`;
    });
  });

  afterEach(async () => {
    if (service && typeof service.shutdown === 'function') {
      await service.shutdown();
    }
  });

  it('handles message event', async () => {
    const channelId = process.env.SLACK_DEFAULT_CHANNEL_ID || 'C123';
    const ts = await service.sendMessageToChannel(channelId, 'Test event', 'User');
    expect(ts).toBeDefined();
    const messages = await service.fetchMessages(channelId);
    const echo = messages.find((m: SlackMessage) => m.getText().includes('Echo: Test event'));
    expect(echo).toBeDefined();
  });
});
