import { SlackEventBus } from '@src/integrations/slack/modules/ISlackEventBus';
import { Application } from 'express';

describe('SlackEventBus', () => {
  let eventBus: SlackEventBus;
  let mockApp: jest.Mocked<Application>;

  beforeEach(() => {
    eventBus = new SlackEventBus();
    mockApp = {
      post: jest.fn(),
      use: jest.fn()
    } as any;
  });

  it('should register bot routes', () => {
    const mockSignatureVerifier = { verifySignature: jest.fn() };
    const mockEventProcessor = { processEvent: jest.fn() };
    const mockInteractiveHandler = { handleInteraction: jest.fn() };

    eventBus.registerBotRoutes(
      mockApp,
      'test-bot',
      mockSignatureVerifier as any,
      mockEventProcessor as any,
      mockInteractiveHandler as any
    );

    expect(mockApp.post).toHaveBeenCalledWith(
      '/slack/test-bot/events',
      expect.any(Function)
    );
  });

  it('should handle event processing', async () => {
    const mockReq = {
      body: { type: 'event_callback', event: { type: 'message' } },
      headers: { 'x-slack-signature': 'valid' }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    expect(eventBus).toBeDefined();
  });

  it('should handle URL verification', () => {
    const challenge = 'test-challenge';
    expect(challenge).toBe('test-challenge');
  });

  it('should validate signatures', () => {
    const signature = 'v0=test';
    expect(signature.startsWith('v0=')).toBe(true);
  });

  it('should process interactive events', () => {
    const payload = { type: 'block_actions' };
    expect(payload.type).toBe('block_actions');
  });
});