import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';

// Import after jest.doMock of config to allow per-test overrides
import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';

// Helper to mock webhookConfig.get dynamically per test
jest.mock('@config/webhookConfig', () => {
  let store: Record<string, string> = {
    WEBHOOK_TOKEN: 'secret-token',
    WEBHOOK_IP_WHITELIST: '',
  };
  return {
    __esModule: true,
    default: {
      get: (key: string) => store[key],
      // expose a setter for tests
      __set: (next: Record<string, string>) => {
        store = { ...store, ...next };
      },
    },
  };
});

type MockedConfig = {
  get: (key: string) => string;
  __set: (next: Record<string, string>) => void;
};

// Utility to update mocked config
function setConfig(next: Record<string, string>) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cfg = require('@config/webhookConfig').default as MockedConfig;
  cfg.__set(next);
}

describe('webhookSecurity edge cases', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    // Attach the middlewares and a terminal handler to inspect outcome
    app.post(
      '/secured',
      (req: Request, res: Response, next: NextFunction) => verifyWebhookToken(req, res, next),
      (req: Request, res: Response, next: NextFunction) => verifyIpWhitelist(req, res, next),
      (_req: Request, res: Response) => res.status(200).send('OK')
    );
    // default baseline
    setConfig({ WEBHOOK_TOKEN: 'secret-token', WEBHOOK_IP_WHITELIST: '' });
  });

  describe('verifyWebhookToken', () => {
    it('allows when header matches configured token', async () => {
      const res = await request(app)
        .post('/secured')
        .set('x-webhook-token', 'secret-token')
        .send({});
      expect(res.status).toBe(200);
    });

    it('blocks with 403 when header is missing', async () => {
      const res = await request(app).post('/secured').send({});
      expect(res.status).toBe(403);
      expect(res.text).toContain('Invalid token');
    });

    it('blocks with 403 when token mismatches', async () => {
      const res = await request(app)
        .post('/secured')
        .set('x-webhook-token', 'wrong')
        .send({});
      expect(res.status).toBe(403);
      expect(res.text).toContain('Invalid token');
    });

    it('throws when WEBHOOK_TOKEN is not defined in config', async () => {
      setConfig({ WEBHOOK_TOKEN: '' });
      // Because the middleware throws, mount a route that catches errors
      const errApp = express();
      errApp.use(express.json());
      errApp.post(
        '/secured',
        (req: Request, _res: Response, next: NextFunction) => {
          try {
            verifyWebhookToken(req, _res, next);
          } catch (e) {
            return next(e);
          }
        },
        (_req, _res, next) => next()
      );
      // Express default error handler returns 500
      const res = await request(errApp).post('/secured').send({});
      expect(res.status).toBe(500);
    });
  });

  describe('verifyIpWhitelist', () => {
    it('allows all when whitelist is empty', async () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '' });
      const res = await request(app)
        .post('/secured')
        .set('x-webhook-token', 'secret-token')
        .send({});
      expect(res.status).toBe(200);
    });

    it('allows when request IP is exactly whitelisted', async () => {
      // Express req.ip may be ::ffff:127.0.0.1 in IPv6 environments. The implementation compares strings exactly.
      // So whitelist must include the literal req.ip value. We probe req.ip by making a request first.
      // Since we cannot read req.ip here, include multiple common loopback representations to guarantee a match.
      setConfig({ WEBHOOK_IP_WHITELIST: '::ffff:127.0.0.1,127.0.0.1,::1' });

      const res = await request(app)
        .post('/secured')
        .set('x-webhook-token', 'secret-token')
        .send({});
      expect(res.status).toBe(200);
    });

    it('blocks when request IP is not in whitelist', async () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '10.1.2.3,192.168.1.10' });
      const res = await request(app)
        .post('/secured')
        .set('x-webhook-token', 'secret-token')
        .send({});
      expect(res.status).toBe(403);
      expect(res.text).toContain('Unauthorized IP address');
    });

    it('documents limitation: CIDR ranges are not supported; mismatching despite CIDR entry', async () => {
      // Current implementation does simple includes() check and does not parse CIDR.
      setConfig({ WEBHOOK_IP_WHITELIST: '127.0.0.0/24' });
      const res = await request(app)
        .post('/secured')
        .set('x-webhook-token', 'secret-token')
        .send({});
      // Since '127.0.0.1' !== '127.0.0.0/24', this will block.
      expect(res.status).toBe(403);
    });
  });
});