import express from 'express';
import { webhookService } from '@webhook/webhookService';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import { IMessengerService } from '@message/interfaces/IMessengerService';

// Spy on configureWebhookRoutes to verify wiring without invoking actual route logic
jest.mock('@webhook/routes/webhookRoutes', () => {
  return {
    __esModule: true,
    configureWebhookRoutes: jest.fn(),
  };
});

describe('webhookService.start', () => {
  let messageService: jest.Mocked<IMessengerService>;

  beforeEach(() => {
    jest.clearAllMocks();
    messageService = {
      sendPublicAnnouncement: jest.fn(),
    } as any;
  });

  it('creates a new Express app and registers routes when app is null', () => {
    webhookService.start(null, messageService, 'any-channel');

    // Should have configured webhook routes exactly once
    expect(configureWebhookRoutes).toHaveBeenCalledTimes(1);
    // The first arg is the express app instance created internally
    const [createdApp, passedMessageService] = (configureWebhookRoutes as jest.Mock).mock.calls[0];
    // Sanity check the created app exposes typical express methods
    expect(typeof createdApp.use).toBe('function');
    expect(typeof createdApp.post).toBe('function');

    // Message service should be passed through
    expect(passedMessageService).toBe(messageService);
  });

  it('reuses provided Express app and registers routes', () => {
    const app = express();
    app.use(express.json());

    webhookService.start(app, messageService, 'channel-123');

    expect(configureWebhookRoutes).toHaveBeenCalledTimes(1);
    const [passedApp, passedMessageService] = (configureWebhookRoutes as jest.Mock).mock.calls[0];
    expect(passedApp).toBe(app);
    expect(passedMessageService).toBe(messageService);
  });
});