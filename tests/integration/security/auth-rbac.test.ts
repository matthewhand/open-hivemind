import { beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/index';
import { AuthManager } from '../../../src/auth/AuthManager';

describe('RBAC & IP Security Integration Tests', () => {
  const authManager = AuthManager.getInstance();
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Register a normal user
    try {
      await authManager.register({
        username: 'rbac-user',
        password: 'password123',
        email: 'user@example.com',
        role: 'user'
      });
    } catch (e) {}

    // Register an admin
    try {
      await authManager.register({
        username: 'rbac-admin',
        password: 'password123',
        email: 'admin@example.com',
        role: 'admin'
      });
    } catch (e) {}

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rbac-user', password: 'password123' });
    userToken = userLogin.body.data?.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'rbac-admin', password: 'password123' });
    adminToken = adminLogin.body.data?.token;
  });

  describe('Role-Based Access Control', () => {
    it('should deny non-admin access to admin routes', async () => {
      expect(userToken).toBeDefined();
      const response = await request(app)
        .get('/api/admin/llm-providers')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should allow admin access to admin routes', async () => {
      expect(adminToken).toBeDefined();
      const response = await request(app)
        .get('/api/admin/llm-providers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(401);
    });
  });

  describe('API Key Authentication', () => {
    it('should validate API keys for admin operations', async () => {
      const testKeys = ['invalid-key', ''];
      for (const key of testKeys) {
        const headers = key ? { 'X-API-Key': key } : {};
        const response = await request(app)
          .get('/api/admin/status')
          .set(headers);

        expect([401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('IP Whitelisting', () => {
    it('should allow access from localhost', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('X-Forwarded-For', '127.0.0.1');

      expect(response.status).toBe(200);
    });
  });
});
