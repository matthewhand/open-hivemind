import request from 'supertest';
import express from 'express';
import { authenticateToken, requirePermission, requireRole, optionalAuth } from '../../../src/server/middleware/auth';
import { AuthManager } from '../../../src/auth/AuthManager';

// Mock AuthManager
jest.mock('../../../src/auth/AuthManager', () => ({
  AuthManager: {
    getInstance: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let app: express.Application;
  let mockAuthManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    mockAuthManager = {
      verifyAccessToken: jest.fn(),
      getUser: jest.fn(),
      hasPermission: jest.fn(),
    };
    (AuthManager.getInstance as jest.Mock).mockReturnValue(mockAuthManager);
  });

  describe('authenticateToken', () => {
    it('should return 401 when no token is provided', async () => {
      app.use(authenticateToken);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Access token required');
    });

    it('should return 403 when token is invalid', async () => {
      mockAuthManager.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      app.use(authenticateToken);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    it('should return 403 when token verification returns null', async () => {
      mockAuthManager.verifyAccessToken.mockReturnValue(null);

      app.use(authenticateToken);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer null-token');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    it('should call next when token is valid', async () => {
      const mockPayload = { userId: 'user1', role: 'admin' };
      mockAuthManager.verifyAccessToken.mockReturnValue(mockPayload);

      app.use(authenticateToken);
      app.get('/test', (req, res) => res.json({ user: req.user }));

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(mockPayload);
    });
  });

  describe('requirePermission', () => {
    it('should return 401 when user is not authenticated', async () => {
      app.use(requirePermission('admin'));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should return 401 when user is not found', async () => {
      app.use((req, res, next) => {
        req.user = { userId: 'user1', role: 'admin' };
        next();
      });
      mockAuthManager.getUser.mockReturnValue(null);
      app.use(requirePermission('admin'));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('User not found');
    });

    it('should return 403 when user lacks permission', async () => {
      app.use((req, res, next) => {
        req.user = { userId: 'user1', role: 'user' };
        next();
      });
      mockAuthManager.getUser.mockReturnValue({ role: 'user' });
      mockAuthManager.hasPermission.mockReturnValue(false);
      app.use(requirePermission('admin'));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Insufficient permissions');
      expect(res.body.required).toBe('admin');
    });

    it('should call next when user has permission', async () => {
      app.use((req, res, next) => {
        req.user = { userId: 'user1', role: 'admin' };
        next();
      });
      mockAuthManager.getUser.mockReturnValue({ role: 'admin' });
      mockAuthManager.hasPermission.mockReturnValue(true);
      app.use(requirePermission('admin'));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
    });
  });

  describe('requireRole', () => {
    it('should return 401 when user is not authenticated', async () => {
      app.use(requireRole('admin'));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('should return 403 when user has wrong role', async () => {
      app.use((req, res, next) => {
        req.user = { userId: 'user1', role: 'user' };
        next();
      });
      app.use(requireRole('admin'));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Insufficient role');
      expect(res.body.required).toBe('admin');
      expect(res.body.userRole).toBe('user');
    });

    it('should call next when user has correct role', async () => {
      app.use((req, res, next) => {
        req.user = { userId: 'user1', role: 'admin' };
        next();
      });
      app.use(requireRole('admin'));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
    });
  });

  describe('optionalAuth', () => {
    it('should call next even without token', async () => {
      app.use(optionalAuth);
      app.get('/test', (req, res) => res.json({ user: req.user || null }));

      const res = await request(app).get('/test');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeNull();
    });

    it('should set user when token is valid', async () => {
      const mockPayload = { userId: 'user1', role: 'admin' };
      mockAuthManager.verifyAccessToken.mockReturnValue(mockPayload);

      app.use(optionalAuth);
      app.get('/test', (req, res) => res.json({ user: req.user }));

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual(mockPayload);
    });

    it('should ignore invalid tokens', async () => {
      mockAuthManager.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      app.use(optionalAuth);
      app.get('/test', (req, res) => res.json({ user: req.user || null }));

      const res = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeNull();
    });
  });
});
