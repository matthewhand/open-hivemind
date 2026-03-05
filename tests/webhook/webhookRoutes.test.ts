import express, { Request, Response } from 'express';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { configureWebhookRoutes } from '@webhook/routes/webhookRoutes';
import * as security from '@webhook/security/webhookSecurity';
import { runRoute } from '../helpers/expressRunner';

// Mock security middlewares to be controllable per test
jest.mock('@webhook/security/webhookSecurity', () => {
  return {
    __esModule: true,
    verifyWebhookToken: jest.fn((req: Request, res: Response, next: Function) => next()),
    verifyIpWhitelist: jest.fn((req: Request, res: Response, next: Function) => next()),
  };
});

describe('webhookRoutes', () => {
  let app: express.Application;
  let messageService: jest.Mocked<IMessengerService>;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Minimal mock for IMessengerService with method used by route
    messageService = {
      sendPublicAnnouncement: jest.fn().mockResolvedValue(undefined),
    } as any;

    configureWebhookRoutes(app, messageService);
  });

  it('returns 200 and sends message on succeeded prediction', async () => {
    const body = {
      id: 'pred-1',
      status: 'succeeded',
      output: ['Answer', 'is', '42'],
    };

    const { res } = await runRoute(app, 'post', '/webhook', { body });
    expect(res.statusCode).toBe(200);

    // The route sends a single announcement with constructed message
    expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(1);
    const [channel, message] = messageService.sendPublicAnnouncement.mock.calls[0];
    expect(channel).toBe(''); // empty per current implementation
    expect(message).toBe('Answer is 42\nImage URL: N/A');
    // Image URL may be undefined if not pre-populated; ensure message contains format when present
  });

  it('returns 200 and sends message on non-succeeded prediction', async () => {
    const body = {
      id: 'pred-2',
      status: 'processing',
      output: [],
    };

    const { res } = await runRoute(app, 'post', '/webhook', { body });
    expect(res.statusCode).toBe(200);

    expect(messageService.sendPublicAnnouncement).toHaveBeenCalledTimes(1);
    const [, message] = messageService.sendPublicAnnouncement.mock.calls[0];
    expect(message).toBe('Prediction ID: pred-2\nStatus: processing');
  });

  it('returns 400 when predictionId or status is missing', async () => {
    const { res: res1 } = await runRoute(app, 'post', '/webhook', {
      body: { status: 'succeeded', output: [] },
    });
    expect(res1.statusCode).toBe(400);
    expect(res1.body.error).toBe('Invalid request body');

    const { res: res2 } = await runRoute(app, 'post', '/webhook', {
      body: { id: 'pred-x', output: [] },
    });
    expect(res2.statusCode).toBe(400);
    expect(res2.body.error).toBe('Invalid request body');

    expect(messageService.sendPublicAnnouncement).not.toHaveBeenCalled();
  }, 10000);

  it('returns 400 for invalid request body formats', async () => {
    // Non-object body
    const { res: res1 } = await runRoute(app, 'post', '/webhook', { body: 'invalid' });
    expect(res1.statusCode).toBe(400);
    expect(res1.body.details).toEqual(['Request body must be a valid JSON object']);

    // Invalid output type
    const { res: res2 } = await runRoute(app, 'post', '/webhook', {
      body: { id: 'test', status: 'succeeded', output: 'not-array' },
    });
    expect(res2.statusCode).toBe(400);
    expect(res2.body.details).toEqual(['Invalid "output" field (must be array if present)']);
  });
});
