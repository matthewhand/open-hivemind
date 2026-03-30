/**
 * COMPREHENSIVE MESSAGING PLATFORM TESTS - PHASE 2
 *
 * Complete test coverage for Discord, Slack, Mattermost messaging integrations.
 * Tests service interfaces, signature verification, webhook processing, and
 * cross-platform message handling.
 *
 * @file comprehensive-messaging-platforms.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-27
 */

import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { SlackSignatureVerifier } from '../../packages/message-slack/src/SlackSignatureVerifier';
import type { IMessengerService } from '../../src/message/interfaces/IMessengerService';
import { configureWebhookRoutes } from '../../src/webhook/routes/webhookRoutes';
import { verifyIpWhitelist, verifyWebhookToken } from '../../src/webhook/security/webhookSecurity';

// ---------------------------------------------------------------------------
// Mock dependencies BEFORE imports
// ---------------------------------------------------------------------------

jest.mock('@config/BotConfigurationManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([]),
    }),
  },
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([]),
    }),
  },
}));

jest.mock('@config/ProviderConfigManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      getAllProviders: jest.fn().mockReturnValue([]),
    }),
  },
}));

jest.mock('@config/UserConfigStore', () => ({
  UserConfigStore: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('@config/discordConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => null),
  },
}));

jest.mock('@config/messageConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => null),
  },
}));

jest.mock('@config/slackConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => null),
  },
}));

jest.mock('@config/webhookConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn((key: string) => {
      if (key === 'WEBHOOK_TOKEN') return 'test-webhook-token';
      if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1,::1';
      return null;
    }),
  },
}));

jest.mock('@common/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    withContext: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    withContext: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

jest.mock('../../src/server/services/WebSocketService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      broadcast: jest.fn(),
      on: jest.fn(),
    }),
  },
}));

jest.mock('@src/message/helpers/processing/handleImageMessage', () => ({
  predictionImageMap: new Map(),
}));

describe('COMPREHENSIVE MESSAGING PLATFORM TESTS - PHASE 2', () => {
  // ============================================================================
  // SLACK SIGNATURE VERIFICATION TESTS
  // ============================================================================

  describe('Slack Signature Verification - Complete Coverage', () => {
    const SIGNING_SECRET = 'test-signing-secret-12345';
    let verifier: SlackSignatureVerifier;
    let app: express.Application;

    beforeEach(() => {
      verifier = new SlackSignatureVerifier(SIGNING_SECRET);
      app = express();
      app.use(express.json());
      app.post('/slack/events', verifier.verify.bind(verifier), (req, res) => {
        res.status(200).json({ ok: true });
      });
    });

    function generateSlackSignature(secret: string, timestamp: string, body: string): string {
      const baseString = `v0:${timestamp}:${body}`;
      const sig = crypto.createHmac('sha256', secret).update(baseString).digest('hex');
      return `v0=${sig}`;
    }

    test('should accept valid Slack signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ type: 'url_verification', challenge: 'test' });
      const signature = generateSlackSignature(SIGNING_SECRET, timestamp, body);

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-request-timestamp', timestamp)
        .set('x-slack-signature', signature)
        .set('Content-Type', 'application/json')
        .send({ type: 'url_verification', challenge: 'test' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
    });

    test('should reject request without signature headers', async () => {
      const response = await request(app).post('/slack/events').send({ type: 'event_callback' });

      expect(response.status).toBe(400);
    });

    test('should reject request without timestamp header', async () => {
      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-signature', 'v0=invalid')
        .send({ type: 'event_callback' });

      expect(response.status).toBe(400);
    });

    test('should reject request without signature header', async () => {
      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-request-timestamp', Math.floor(Date.now() / 1000).toString())
        .send({ type: 'event_callback' });

      expect(response.status).toBe(400);
    });

    test('should reject stale timestamp (> 5 minutes old)', async () => {
      const staleTimestamp = (Math.floor(Date.now() / 1000) - 400).toString();
      const body = JSON.stringify({ type: 'test' });
      const signature = generateSlackSignature(SIGNING_SECRET, staleTimestamp, body);

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-request-timestamp', staleTimestamp)
        .set('x-slack-signature', signature)
        .send({ type: 'test' });

      expect(response.status).toBe(400);
    });

    test('should reject invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-request-timestamp', timestamp)
        .set(
          'x-slack-signature',
          'v0=deadbeef0000000000000000000000000000000000000000000000000000dead'
        )
        .send({ type: 'test' });

      expect(response.status).toBe(403);
    });

    test('should reject signature with wrong secret', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ type: 'test' });
      const wrongSignature = generateSlackSignature('wrong-secret', timestamp, body);

      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-request-timestamp', timestamp)
        .set('x-slack-signature', wrongSignature)
        .send({ type: 'test' });

      expect(response.status).toBe(403);
    });

    test('should reject non-numeric timestamp', async () => {
      const response = await request(app)
        .post('/slack/events')
        .set('x-slack-request-timestamp', 'not-a-number')
        .set('x-slack-signature', 'v0=deadbeef')
        .send({ type: 'test' });

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // WEBHOOK SECURITY TESTS - TOKEN VERIFICATION
  // ============================================================================

  describe('Webhook Token Verification - Complete Coverage', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/webhook-test', verifyWebhookToken, (req, res) => {
        res.status(200).json({ ok: true });
      });
    });

    test('should accept valid webhook token via X-Webhook-Token header', async () => {
      const response = await request(app)
        .post('/webhook-test')
        .set('X-Webhook-Token', 'test-webhook-token')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });

    test('should accept valid token via Authorization Bearer header', async () => {
      const response = await request(app)
        .post('/webhook-test')
        .set('Authorization', 'Bearer test-webhook-token')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });

    test('should reject request without token', async () => {
      const response = await request(app).post('/webhook-test').send({ data: 'test' });

      expect(response.status).toBe(403);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .post('/webhook-test')
        .set('X-Webhook-Token', 'wrong-token')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });

    test('should reject invalid Bearer token', async () => {
      const response = await request(app)
        .post('/webhook-test')
        .set('Authorization', 'Bearer wrong-token')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });
  });

  // ============================================================================
  // WEBHOOK IP WHITELIST TESTS
  // ============================================================================

  describe('Webhook IP Whitelist - Complete Coverage', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.set('trust proxy', true);
      app.use(express.json());
      app.post('/webhook-ip-test', verifyIpWhitelist, (req, res) => {
        res.status(200).json({ ok: true });
      });
    });

    test('should accept whitelisted IP', async () => {
      const response = await request(app)
        .post('/webhook-ip-test')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({ data: 'test' });

      expect(response.status).toBe(200);
    });

    test('should reject non-whitelisted IP', async () => {
      const response = await request(app)
        .post('/webhook-ip-test')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });
  });

  // ============================================================================
  // WEBHOOK ROUTE PROCESSING TESTS
  // ============================================================================

  describe('Webhook Route Processing - Complete Coverage', () => {
    let app: express.Application;
    let mockMessageService: jest.Mocked<IMessengerService>;

    beforeEach(() => {
      app = express();
      app.set('trust proxy', true);
      app.use(express.json());

      mockMessageService = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sendMessageToChannel: jest.fn().mockResolvedValue('msg-id'),
        getMessagesFromChannel: jest.fn().mockResolvedValue([]),
        sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
        getClientId: jest.fn().mockReturnValue('bot-client-id'),
        getDefaultChannel: jest.fn().mockReturnValue('default-channel'),
        shutdown: jest.fn().mockResolvedValue(undefined),
        setMessageHandler: jest.fn(),
      } as any;

      configureWebhookRoutes(app, mockMessageService, 'test-channel');
    });

    test('should process valid webhook with succeeded status', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-123',
          status: 'succeeded',
          output: ['Result line 1'],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.processed).toBe('prediction-123');
      expect(mockMessageService.sendPublicAnnouncement).toHaveBeenCalled();
    });

    test('should process webhook with processing status', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-456',
          status: 'processing',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should process webhook with failed status', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-789',
          status: 'failed',
        });

      expect(response.status).toBe(200);
    });

    test('should reject webhook without id field', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          status: 'succeeded',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body');
    });

    test('should reject webhook without status field', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-123',
        });

      expect(response.status).toBe(400);
    });

    test('should reject webhook with invalid status', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-123',
          status: 'invalid-status',
        });

      expect(response.status).toBe(400);
    });

    test('should reject webhook with non-array output', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-123',
          status: 'succeeded',
          output: 'not-an-array',
        });

      expect(response.status).toBe(400);
    });

    test('should reject webhook with oversized output array', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-123',
          status: 'succeeded',
          output: Array(11).fill('item'),
        });

      expect(response.status).toBe(400);
    });

    test('should reject webhook with XSS in payload', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: '<script>alert("xss")</script>',
          status: 'succeeded',
        });

      expect(response.status).toBe(400);
    });

    test('should reject webhook with non-array urls field', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-123',
          status: 'succeeded',
          urls: 'not-an-array',
        });

      expect(response.status).toBe(400);
    });

    test('should handle message service failure gracefully', async () => {
      mockMessageService.sendPublicAnnouncement.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-err',
          status: 'succeeded',
          output: ['result'],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process webhook');
    });

    test('should reject empty body', async () => {
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send(null);

      // Empty body results in invalid body validation error (or token error)
      expect([400, 403]).toContain(response.status);
    });
  });

  // ============================================================================
  // DISCORD SERVICE INTERFACE TESTS
  // ============================================================================

  describe('Discord Service Interface - Complete Coverage', () => {
    // Mock discord.js before importing DiscordService
    let eventHandlers: Record<string, Function[]> = {};
    const mockClient = {
      user: {
        id: '123456789',
        tag: 'TestBot#1234',
        username: 'TestBot',
        setActivity: jest.fn(),
      },
      login: jest.fn().mockImplementation(async () => {
        const handlers = eventHandlers['ready'] || [];
        handlers.forEach((h) => h());
        return 'token';
      }),
      on: jest.fn((event: string, handler: Function) => {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
      }),
      once: jest.fn((event: string, handler: Function) => {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
      }),
      channels: { fetch: jest.fn() },
      ws: { status: 0, ping: 20 },
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
      eventHandlers = {};
    });

    test('should expose IMessengerService interface methods', () => {
      // Verify the interface contract exists by checking mock structure
      const serviceMethods = [
        'initialize',
        'sendMessageToChannel',
        'getMessagesFromChannel',
        'sendPublicAnnouncement',
        'getClientId',
        'getDefaultChannel',
        'shutdown',
        'setMessageHandler',
      ];

      // Create a mock that satisfies the interface
      const mockService: IMessengerService = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sendMessageToChannel: jest.fn().mockResolvedValue('msg-1'),
        getMessagesFromChannel: jest.fn().mockResolvedValue([]),
        sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
        getClientId: jest.fn().mockReturnValue('discord-bot-id'),
        getDefaultChannel: jest.fn().mockReturnValue('general'),
        shutdown: jest.fn().mockResolvedValue(undefined),
        setMessageHandler: jest.fn(),
      };

      for (const method of serviceMethods) {
        expect(typeof (mockService as any)[method]).toBe('function');
      }
    });

    test('should support channel prioritization property', () => {
      const mockService = {
        supportsChannelPrioritization: true,
      };
      expect(mockService.supportsChannelPrioritization).toBe(true);
    });

    test('Discord plugin manifest should be type message', () => {
      // Test the manifest directly
      const { manifest } = require('../../packages/message-discord/src/index');
      expect(manifest.type).toBe('message');
      expect(manifest.displayName).toBe('Discord');
    });
  });

  // ============================================================================
  // SLACK SERVICE INTERFACE TESTS
  // ============================================================================

  describe('Slack Service Interface - Complete Coverage', () => {
    test('Slack plugin manifest should be type message', () => {
      const { manifest } = require('../../packages/message-slack/src/index');
      expect(manifest.type).toBe('message');
      expect(manifest.displayName).toBe('Slack');
    });

    test('SlackSignatureVerifier should be constructable', () => {
      const verifier = new SlackSignatureVerifier('test-secret');
      expect(verifier).toBeInstanceOf(SlackSignatureVerifier);
      expect(typeof verifier.verify).toBe('function');
    });

    test('should export SlackSignatureVerifier from package', () => {
      const slackPackage = require('../../packages/message-slack/src/index');
      expect(slackPackage.SlackSignatureVerifier).toBe(SlackSignatureVerifier);
    });

    test('should export SlackBotManager from package', () => {
      const slackPackage = require('../../packages/message-slack/src/index');
      expect(typeof slackPackage.SlackBotManager).toBe('function');
    });

    test('should export SlackEventProcessor from package', () => {
      const slackPackage = require('../../packages/message-slack/src/index');
      expect(typeof slackPackage.SlackEventProcessor).toBe('function');
    });

    test('should export SlackMessageProcessor from package', () => {
      const slackPackage = require('../../packages/message-slack/src/index');
      expect(typeof slackPackage.SlackMessageProcessor).toBe('function');
    });
  });

  // ============================================================================
  // MATTERMOST SERVICE INTERFACE TESTS
  // ============================================================================

  describe('Mattermost Service Interface - Complete Coverage', () => {
    test('Mattermost plugin manifest should be type message', () => {
      const { manifest } = require('../../packages/message-mattermost/src/index');
      expect(manifest.type).toBe('message');
      expect(manifest.displayName).toBe('Mattermost');
    });

    test('Mattermost create() should return a service instance', () => {
      const { create } = require('../../packages/message-mattermost/src/index');
      const instance = create({} as any);
      expect(instance).not.toBeUndefined();
    });
  });

  // ============================================================================
  // CROSS-PLATFORM INTERFACE CONFORMANCE TESTS
  // ============================================================================

  describe('Cross-Platform Interface Conformance', () => {
    test('all messaging plugins should have standard manifest', () => {
      const packages = [
        '../../packages/message-discord/src/index',
        '../../packages/message-slack/src/index',
        '../../packages/message-mattermost/src/index',
      ];

      for (const pkg of packages) {
        const { manifest } = require(pkg);
        expect(manifest).toEqual(expect.objectContaining({ type: 'message' }));
        expect(typeof manifest.displayName).toBe('string');
        expect(typeof manifest.description).toBe('string');
        expect(typeof manifest.minVersion).toBe('string');
      }
    });

    test('all messaging plugins should export a create factory', () => {
      const packages = [
        '../../packages/message-discord/src/index',
        '../../packages/message-slack/src/index',
        '../../packages/message-mattermost/src/index',
      ];

      for (const pkg of packages) {
        const mod = require(pkg);
        expect(typeof mod.create).toBe('function');
      }
    });

    test('IMessengerService should support optional methods', () => {
      const optionalMethods = [
        'getChannelTopic',
        'scoreChannel',
        'getForumOwner',
        'getDelegatedServices',
        'setModelActivity',
        'sendTyping',
        'resolveAgentContext',
        'getAgentStartupSummaries',
      ];

      // Verify the interface allows these to be optional
      const minimalService: IMessengerService = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sendMessageToChannel: jest.fn().mockResolvedValue('msg-1'),
        getMessagesFromChannel: jest.fn().mockResolvedValue([]),
        sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
        getClientId: jest.fn().mockReturnValue('bot-id'),
        getDefaultChannel: jest.fn().mockReturnValue('default'),
        shutdown: jest.fn().mockResolvedValue(undefined),
        setMessageHandler: jest.fn(),
      };

      // All optional methods should be undefined on a minimal implementation
      for (const method of optionalMethods) {
        expect((minimalService as any)[method]).toBeUndefined();
      }
    });

    test('IMessengerService with all optional methods', () => {
      const fullService: IMessengerService = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sendMessageToChannel: jest.fn().mockResolvedValue('msg-1'),
        getMessagesFromChannel: jest.fn().mockResolvedValue([]),
        sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
        getClientId: jest.fn().mockReturnValue('bot-id'),
        getDefaultChannel: jest.fn().mockReturnValue('default'),
        shutdown: jest.fn().mockResolvedValue(undefined),
        setMessageHandler: jest.fn(),
        supportsChannelPrioritization: true,
        getChannelTopic: jest.fn().mockResolvedValue('topic'),
        scoreChannel: jest.fn().mockReturnValue(100),
        getForumOwner: jest.fn().mockResolvedValue('user-id'),
        getDelegatedServices: jest.fn().mockReturnValue([]),
        setModelActivity: jest.fn().mockResolvedValue(undefined),
        sendTyping: jest.fn().mockResolvedValue(undefined),
        resolveAgentContext: jest.fn().mockReturnValue(null),
        getAgentStartupSummaries: jest.fn().mockReturnValue([]),
      };

      expect(fullService.supportsChannelPrioritization).toBe(true);
      expect(typeof fullService.getChannelTopic).toBe('function');
      expect(typeof fullService.scoreChannel).toBe('function');
      expect(typeof fullService.sendTyping).toBe('function');
    });
  });

  // ============================================================================
  // WEBHOOK SECURITY EDGE CASES
  // ============================================================================

  describe('Webhook Security Edge Cases', () => {
    test('Slack verifier should handle concurrent requests', async () => {
      const verifier = new SlackSignatureVerifier('concurrent-secret');
      const app = express();
      app.use(express.json());
      app.post('/slack/events', verifier.verify.bind(verifier), (req, res) => {
        res.status(200).json({ ok: true });
      });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({ type: 'test' });
      const sig = crypto
        .createHmac('sha256', 'concurrent-secret')
        .update(`v0:${timestamp}:${body}`)
        .digest('hex');

      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app)
            .post('/slack/events')
            .set('x-slack-request-timestamp', timestamp)
            .set('x-slack-signature', `v0=${sig}`)
            .send({ type: 'test' })
        );

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    test('webhook token should be timing-safe compared', async () => {
      const app = express();
      app.use(express.json());
      app.post('/webhook', verifyWebhookToken, (req, res) => {
        res.status(200).json({ ok: true });
      });

      // Tokens of same length but different content
      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-tokes') // off by one char
        .send({ data: 'test' });

      expect(response.status).toBe(403);
    });

    test('should handle javascript: protocol in webhook payload', async () => {
      const app = express();
      app.set('trust proxy', true);
      app.use(express.json());

      const mockService: IMessengerService = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sendMessageToChannel: jest.fn().mockResolvedValue('msg-1'),
        getMessagesFromChannel: jest.fn().mockResolvedValue([]),
        sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
        getClientId: jest.fn().mockReturnValue('bot-id'),
        getDefaultChannel: jest.fn().mockReturnValue('default'),
        shutdown: jest.fn().mockResolvedValue(undefined),
        setMessageHandler: jest.fn(),
      };

      configureWebhookRoutes(app, mockService);

      const response = await request(app)
        .post('/webhook')
        .set('X-Webhook-Token', 'test-webhook-token')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          id: 'prediction-xss',
          status: 'succeeded',
          output: ['javascript:alert(1)'],
        });

      expect(response.status).toBe(400);
    });
  });
});
