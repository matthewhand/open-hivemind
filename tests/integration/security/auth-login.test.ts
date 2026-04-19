import { beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/index';
import { AuthManager } from '../../../src/auth/AuthManager';

describe('Authentication (Login) Integration Tests', () => {
  const authManager = AuthManager.getInstance();

  beforeAll(async () => {
    // Ensure we have a test user
    try {
      await authManager.register({
        username: 'test-user',
        password: 'test-password',
        email: 'test@example.com',
        role: 'user'
      });
    } catch (e) {
      // User might already exist
    }
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test-user',
          password: 'test-password',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should fail to login with incorrect credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test-user',
          password: 'wrong-password',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test-user',
          password: 'test-password',
        });
      refreshToken = response.body.data?.refreshToken;
    });

    it('should refresh token successfully', async () => {
      expect(refreshToken).toBeDefined();
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token: string;
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test-user',
          password: 'test-password',
        });
      token = response.body.data?.token;
      refreshToken = response.body.data?.refreshToken;
    });

    it('should logout successfully', async () => {
      expect(token).toBeDefined();
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
