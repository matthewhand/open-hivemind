import request from 'supertest';
import express from 'express';
import { adminRouter } from '../../../src/admin/adminRoutes';
import { AuthManager } from '../../../src/auth/AuthManager';

// Some CI/sandbox environments forbid binding to 0.0.0.0/localhost.
// Supertest opens an ephemeral port under the hood, which will fail with EPERM.
// Detect this early and skip the suite in such environments to avoid hard failures.
const canListenLocally = (() => {
  try {
    const net = require('net');
    const srv = net.createServer();
    // Prefer binding to 127.0.0.1 explicitly
    srv.listen(0, '127.0.0.1');
    srv.close();
    return true;
  } catch (_e) {
    return false;
  }
})();
const describeIf = canListenLocally ? describe : describe.skip;

const app = express();
app.use(express.json());
app.use('/admin', adminRouter);

// Mock the SlackService and Discord service to avoid actual API calls
jest.mock('@integrations/slack/SlackService', () => ({
  SlackService: {
    getInstance: jest.fn(() => ({
      getBotNames: jest.fn(() => []),
      getBotConfig: jest.fn(() => ({}))
    }))
  }
}));

jest.mock('@integrations/discord/DiscordService', () => ({
  Discord: {
    DiscordService: {
      getInstance: jest.fn(() => ({
        getAllBots: jest.fn(() => [])
      }))
    }
  }
}));

describeIf('Admin Routes RBAC', () => {
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Reset singleton instance for tests
    (AuthManager as any).instance = null;
    // Get auth manager instance
    const authManager = AuthManager.getInstance();

    // Create admin token (default admin user exists)
    const adminLogin = await authManager.login({ username: 'admin', password: 'admin123!' });
    adminToken = adminLogin.accessToken;

    // Create a regular user for testing
    await authManager.register({
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpass123',
      role: 'user'
    });

    const userLogin = await authManager.login({ username: 'testuser', password: 'testpass123' });
    userToken = userLogin.accessToken;
  });

  describe('Authentication required', () => {
    it('should deny access without authentication', async () => {
      const response = await request(app)
        .get('/admin/status')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/admin/status')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });
  });

  describe('Authenticated access', () => {
    it('should allow admin to access status endpoint', async () => {
      const response = await request(app)
        .get('/admin/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
    });

    it('should allow regular user to access status endpoint', async () => {
      const response = await request(app)
        .get('/admin/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
    });
  });

  describe('Provider metadata endpoints', () => {
    it('returns LLM provider metadata with docs/help', async () => {
      const response = await request(app)
        .get('/admin/llm-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body.providers.length).toBeGreaterThan(0);
      const provider = response.body.providers[0];
      expect(provider).toHaveProperty('key');
      expect(provider).toHaveProperty('label');
      expect(provider).toHaveProperty('docsUrl');
      expect(provider).toHaveProperty('helpText');
    });

    it('returns messenger provider metadata with docs/help', async () => {
      const response = await request(app)
        .get('/admin/messenger-providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body.providers.length).toBeGreaterThan(0);
      const provider = response.body.providers[0];
      expect(provider).toHaveProperty('key');
      expect(provider).toHaveProperty('label');
      expect(provider).toHaveProperty('helpText');
    });
  });

  describe('Admin-only operations', () => {
    it('should allow admin to create Slack bot', async () => {
      const response = await request(app)
        .post('/admin/slack-bots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'test-bot',
          botToken: 'test-token',
          signingSecret: 'test-secret'
        })
        .expect(200); // Admin should be able to access this endpoint

      // Should not be 401 or 403 (auth/role errors)
      expect(response.body.error).not.toBe('Authentication required');
      expect(response.body.error).not.toBe('Insufficient permissions');
      expect(response.body.ok).toBe(true);
    });

    it('should deny regular user from creating Slack bot', async () => {
      const response = await request(app)
        .post('/admin/slack-bots')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'test-bot',
          botToken: 'test-token',
          signingSecret: 'test-secret'
        })
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
      expect(response.body.message).toContain('Required role: admin');
    });

    it('should deny regular user from creating Discord bot', async () => {
      const response = await request(app)
        .post('/admin/discord-bots')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          token: 'test-discord-token'
        })
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should deny regular user from reloading bots', async () => {
      const response = await request(app)
        .post('/admin/reload')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
});
