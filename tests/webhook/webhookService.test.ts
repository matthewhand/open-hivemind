import express from 'express';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import { webhookService } from '@webhook/webhookService';

// Mock dependencies
jest.mock('@webhook/routes/webhookRoutes', () => ({
  __esModule: true,
  configureWebhookRoutes: jest.fn(),
}));

jest.mock('express', () => {
  const actualExpress = jest.requireActual('express');
  const mockApp = {
    use: jest.fn(),
    post: jest.fn(),
    get: jest.fn(),
    listen: jest.fn(),
  };
  return Object.assign(
    jest.fn(() => mockApp),
    actualExpress,
    { mockApp }
  );
});

const mockConfigureWebhookRoutes = configureWebhookRoutes as jest.MockedFunction<
  typeof configureWebhookRoutes
>;
const mockExpress = express as jest.MockedFunction<typeof express> & { mockApp: any };

describe('webhookService', () => {
  let messageService: jest.Mocked<IMessengerService>;
  let mockApp: any;

  beforeEach(() => {
    jest.clearAllMocks();

    messageService = {
      sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
      sendMessageToChannel: jest.fn().mockResolvedValue('msg-123'),
      getMessagesFromChannel: jest.fn().mockResolvedValue([]),
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getClientId: jest.fn().mockReturnValue('client-123'),
      getDefaultChannel: jest.fn().mockReturnValue('default-channel'),
      setMessageHandler: jest.fn(),
    } as any;

    mockApp = {
      use: jest.fn(),
      post: jest.fn(),
      get: jest.fn(),
      listen: jest.fn(),
    };

    mockExpress.mockReturnValue(mockApp);
  });

  describe('service initialization', () => {
    it('should create a new Express app when app is null', () => {
      webhookService.start(null, messageService, 'test-channel');

      expect(mockExpress).toHaveBeenCalledTimes(1);
      expect(mockConfigureWebhookRoutes).toHaveBeenCalledTimes(1);

      const [createdApp, passedMessageService, passedChannel] =
        mockConfigureWebhookRoutes.mock.calls[0];
      expect(createdApp).toBe(mockApp);
      expect(passedMessageService).toBe(messageService);
      expect(passedChannel).toBe('test-channel');
    });

    it('should reuse provided Express app', () => {
      const existingApp = express();

      webhookService.start(existingApp, messageService, 'channel-123');

      expect(mockConfigureWebhookRoutes).toHaveBeenCalledTimes(1);
      const [passedApp, passedMessageService, passedChannel] =
        mockConfigureWebhookRoutes.mock.calls[0];
      expect(passedApp).toBe(existingApp);
      expect(passedMessageService).toBe(messageService);
      expect(passedChannel).toBe('channel-123');
    });

    it('should handle undefined app parameter', () => {
      webhookService.start(undefined as any, messageService, 'test-channel');

      expect(mockExpress).toHaveBeenCalledTimes(1);
      expect(mockConfigureWebhookRoutes).toHaveBeenCalledTimes(1);
    });
  });

  describe('service configuration', () => {
    it('should pass correct parameters to route configuration', () => {
      const testChannel = 'webhook-channel-456';

      webhookService.start(null, messageService, testChannel);

      expect(mockConfigureWebhookRoutes).toHaveBeenCalledWith(
        expect.any(Object),
        messageService,
        testChannel
      );
    });

    it('should handle different channel configurations', () => {
      const channels = ['general', 'webhooks', 'notifications', ''];

      channels.forEach((channel) => {
        jest.clearAllMocks();
        webhookService.start(null, messageService, channel);

        expect(mockConfigureWebhookRoutes).toHaveBeenCalledTimes(1);
        expect(mockConfigureWebhookRoutes).toHaveBeenCalledWith(
          expect.any(Object),
          messageService,
          channel
        );
      });
    });

    it('should work with different messenger service implementations', () => {
      const alternativeService = {
        ...messageService,
        sendPublicAnnouncement: jest.fn().mockResolvedValue('alt-response'),
        getClientId: jest.fn().mockReturnValue('alt-client'),
      } as any;

      webhookService.start(null, alternativeService, 'test-channel');

      expect(mockConfigureWebhookRoutes).toHaveBeenCalledWith(
        expect.any(Object),
        alternativeService,
        'test-channel'
      );
    });
  });

  describe('error handling', () => {
    it('should handle route configuration errors gracefully', () => {
      mockConfigureWebhookRoutes.mockImplementation(() => {
        throw new Error('Route configuration failed');
      });

      expect(() => {
        webhookService.start(null, messageService, 'test-channel');
      }).toThrow('Route configuration failed');
    });

    it('should handle express app creation errors', () => {
      mockExpress.mockImplementation(() => {
        throw new Error('Express app creation failed');
      });

      expect(() => {
        webhookService.start(null, messageService, 'test-channel');
      }).toThrow('Express app creation failed');
    });

    it('should handle null message service', () => {
      expect(() => {
        webhookService.start(null, null as any, 'test-channel');
      }).not.toThrow();

      expect(mockConfigureWebhookRoutes).toHaveBeenCalledWith(
        expect.any(Object),
        null,
        'test-channel'
      );
    });
  });

  describe('service lifecycle', () => {
    beforeEach(() => {
      // Restore normal mock behavior
      mockConfigureWebhookRoutes.mockImplementation(() => {});
      mockExpress.mockReturnValue(mockApp);
    });

    it('should be callable multiple times', () => {
      webhookService.start(null, messageService, 'channel-1');
      webhookService.start(null, messageService, 'channel-2');
      webhookService.start(null, messageService, 'channel-3');

      expect(mockExpress).toHaveBeenCalledTimes(3);
      expect(mockConfigureWebhookRoutes).toHaveBeenCalledTimes(3);
    });

    it('should handle rapid successive calls', () => {
      for (let i = 0; i < 10; i++) {
        webhookService.start(null, messageService, `channel-${i}`);
      }

      expect(mockExpress).toHaveBeenCalledTimes(10);
      expect(mockConfigureWebhookRoutes).toHaveBeenCalledTimes(10);
    });

    it('should maintain service isolation between calls', () => {
      const service1 = { ...messageService, getClientId: () => 'client-1' } as any;
      const service2 = { ...messageService, getClientId: () => 'client-2' } as any;

      webhookService.start(null, service1, 'channel-1');
      webhookService.start(null, service2, 'channel-2');

      const calls = mockConfigureWebhookRoutes.mock.calls;
      expect(calls[0][1]).toBe(service1);
      expect(calls[1][1]).toBe(service2);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      // Restore normal mock behavior
      mockConfigureWebhookRoutes.mockImplementation(() => {});
      mockExpress.mockReturnValue(mockApp);
    });

    it('should work with pre-configured Express app', () => {
      const app = express();
      app.use(express.json());
      app.use('/api', express.Router());

      webhookService.start(app, messageService, 'integration-channel');

      expect(mockConfigureWebhookRoutes).toHaveBeenCalledWith(
        app,
        messageService,
        'integration-channel'
      );
    });

    it('should handle complex messenger service configurations', () => {
      const complexService = {
        ...messageService,
        sendPublicAnnouncement: jest.fn().mockImplementation(async (channel, message) => {
          if (channel === 'error-channel') throw new Error('Send failed');
          return 'success';
        }),
        getClientId: jest.fn().mockReturnValue('complex-client-id'),
        customMethod: jest.fn().mockReturnValue('custom-result'),
      } as any;

      webhookService.start(null, complexService, 'complex-channel');

      expect(mockConfigureWebhookRoutes).toHaveBeenCalledWith(
        expect.any(Object),
        complexService,
        'complex-channel'
      );
    });

    it('should validate app object structure', () => {
      const app = express();

      webhookService.start(app, messageService, 'validation-channel');

      const [passedApp] = mockConfigureWebhookRoutes.mock.calls[0];
      expect(passedApp).toBe(app);
      expect(typeof passedApp.use).toBe('function');
      expect(typeof passedApp.post).toBe('function');
    });
  });
});
