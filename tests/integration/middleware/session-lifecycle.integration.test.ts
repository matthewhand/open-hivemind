import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { destroySession } from '../../../src/middleware/sessionMiddleware';

describe('Session Lifecycle Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(session({
      secret: 'test-secret-at-least-32-chars-long-now',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    }));

    app.get('/set-session', (req, res) => {
      (req.session as any).user = 'test-user';
      res.status(200).send('Session set');
    });

    app.get('/get-session', (req, res) => {
      if ((req.session as any).user) {
        res.status(200).send(`User: ${(req.session as any).user}`);
      } else {
        res.status(404).send('No session');
      }
    });

    app.post('/destroy-session', async (req, res) => {
      try {
        await destroySession(req);
        res.status(200).send('Session destroyed');
      } catch (err) {
        res.status(500).send('Failed to destroy');
      }
    });
  });

  it('should maintain session state across requests and destroy it when requested', async () => {
    const agent = request.agent(app);

    // 1. Initially no session
    await agent.get('/get-session').expect(404);

    // 2. Set session
    await agent.get('/set-session').expect(200);

    // 3. Verify session exists
    await agent.get('/get-session').expect(200, 'User: test-user');

    // 4. Destroy session
    await agent.post('/destroy-session').expect(200, 'Session destroyed');

    // 5. Verify session is gone
    await agent.get('/get-session').expect(404);
  });
});
