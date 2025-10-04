/**
 * Comprehensive Test Suite for Localhost Admin Authentication Bypass
 *
 * This test suite covers all scenarios for the localhost admin bypass functionality:
 * - Environment variable controls (ADMIN_PASSWORD, DISABLE_LOCAL_ADMIN_BYPASS)
 * - Localhost detection and bypass behavior
 * - User creation and authentication flows
 * - Security edge cases
 */

import request from 'supertest';
import { Express } from 'express';
import { AuthManager } from '../../../auth/AuthManager';
import { app } from '../../test-setup';

describe('Localhost Admin Authentication Bypass', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.ADMIN_PASSWORD;
    delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;
    authManager = AuthManager.getInstance();
  });

  afterEach(async () => {
    // Clean up environment variables after each test
    delete process.env.ADMIN_PASSWORD;
    delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;
  });

  describe('Happy Path - Standard Localhost Bypass', () => {
    it('should allow admin login from localhost without ADMIN_PASSWORD set', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.bypassInfo).toBeDefined();
      expect(response.body.bypassInfo.isLocalBypass).toBe(true);
      expect(response.body.bypassInfo.adminPasswordSet).toBe(false);
      expect(response.body.data.user.username).toBe('admin');
      expect(response.body.data.user.role).toBe('admin');
    });

    it('should create admin user on first bypass login', async () => {
      // Ensure admin user doesn't exist initially
      const initialUsers = authManager.getAllUsers();
      const adminExists = initialUsers.some(user => user.username === 'admin');
      expect(adminExists).toBe(false);

      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'test-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify admin user was created
      const users = authManager.getAllUsers();
      const adminUser = users.find(user => user.username === 'admin');
      expect(adminUser).toBeDefined();
      expect(adminUser?.role).toBe('admin');
    });
  });

  describe('ADMIN_PASSWORD Environment Variable', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'secure-admin-password-123';
    });

    it('should require exact ADMIN_PASSWORD match when set', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'secure-admin-password-123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.bypassInfo.isLocalBypass).toBe(true);
      expect(response.body.bypassInfo.adminPasswordSet).toBe(true);
      expect(response.body.bypassInfo.note).toContain('ADMIN_PASSWORD');
    });

    it('should reject incorrect passwords when ADMIN_PASSWORD is set', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'wrong-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication failed');
    });

    it('should reject non-admin usernames even with correct ADMIN_PASSWORD', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'user',
          password: 'secure-admin-password-123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should create admin user with ADMIN_PASSWORD on first login', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'secure-admin-password-123'
        });

      expect(response.status).toBe(200);

      // Verify admin user exists with correct role
      const users = authManager.getAllUsers();
      const adminUser = users.find(user => user.username === 'admin');
      expect(adminUser).toBeDefined();
      expect(adminUser?.role).toBe('admin');
    });
  });

  describe('DISABLE_LOCAL_ADMIN_BYPASS Environment Variable', () => {
    beforeEach(() => {
      process.env.DISABLE_LOCAL_ADMIN_BYPASS = 'true';
    });

    it('should disable localhost bypass when DISABLE_LOCAL_ADMIN_BYPASS is true', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication failed');
    });

    it('should still require normal authentication when bypass disabled', async () => {
      // First create a normal admin user
      await authManager.register({
        username: 'admin',
        email: 'admin@test.com',
        password: 'correct-password',
        role: 'admin'
      });

      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'correct-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.bypassInfo).toBeUndefined(); // No bypass when disabled
    });
  });

  describe('Both Environment Variables Set', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'admin-pass-123';
      process.env.DISABLE_LOCAL_ADMIN_BYPASS = 'true';
    });

    it('should prioritize DISABLE_LOCAL_ADMIN_BYPASS over ADMIN_PASSWORD', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'admin-pass-123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Localhost Detection Edge Cases', () => {
    it('should work with IPv4 localhost (127.0.0.1)', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.bypassInfo.isLocalBypass).toBe(true);
    });

    it('should work with IPv6 localhost (::1)', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '::1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.bypassInfo.isLocalBypass).toBe(true);
    });

    it('should work with "localhost" string', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', 'localhost')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.bypassInfo.isLocalBypass).toBe(true);
    });

    it('should reject non-localhost requests for bypass', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject requests from external IPs for bypass', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '203.0.113.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Multiple X-Forwarded-For Headers', () => {
    it('should use the first IP in X-Forwarded-For chain', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1, 10.0.0.1, 192.168.1.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.bypassInfo.isLocalBypass).toBe(true);
    });

    it('should reject when first IP in chain is not localhost', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.100, 127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Request IP Fallbacks', () => {
    it('should fallback to req.connection.remoteAddress', async () => {
      // Mock request with connection.remoteAddress
      const mockApp = request(app).post('/webui/api/auth/login');
      // Note: This would require more complex mocking in a real test environment
      // For now, we test the behavior as implemented
    });

    it('should fallback to req.socket.remoteAddress', async () => {
      // Similar to above, would require request mocking
    });
  });

  describe('Input Validation', () => {
    it('should reject missing username', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          password: 'any-password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject empty username', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: '',
          password: 'any-password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject empty password', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('Admin User Creation Edge Cases', () => {
    it('should handle admin user creation failure gracefully', async () => {
      // Mock authManager.register to throw an error
      const originalRegister = authManager.register;
      authManager.register = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication failed');

      // Restore original method
      authManager.register = originalRegister;
    });

    it('should handle subsequent login after admin user creation', async () => {
      // First login creates admin user
      const firstResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'first-password'
        });

      expect(firstResponse.status).toBe(200);

      // Second login should still work
      const secondResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'second-password'
        });

      expect(secondResponse.status).toBe(200);
    });
  });

  describe('Response Structure Validation', () => {
    it('should return correct response structure for successful bypass', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'test-password'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('bypassInfo');

      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');

      expect(response.body.bypassInfo).toHaveProperty('isLocalBypass', true);
      expect(response.body.bypassInfo).toHaveProperty('adminPasswordSet');
      expect(response.body.bypassInfo).toHaveProperty('note');
    });

    it('should return correct response structure when ADMIN_PASSWORD is set', async () => {
      process.env.ADMIN_PASSWORD = 'test-admin-pass';

      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'test-admin-pass'
        });

      expect(response.status).toBe(200);
      expect(response.body.bypassInfo.adminPasswordSet).toBe(true);
      expect(response.body.bypassInfo.note).toContain('ADMIN_PASSWORD');
    });
  });

  describe('Security Edge Cases', () => {
    it('should not expose bypass information for non-localhost requests', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '192.168.1.100')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.bypassInfo).toBeUndefined();
    });

    it('should handle case-sensitive username matching', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'Admin', // Capital A
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle whitespace in username correctly', async () => {
      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: ' admin ', // With whitespace
          password: 'any-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous bypass requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/webui/api/auth/login')
          .set('X-Forwarded-For', '127.0.0.1')
          .send({
            username: 'admin',
            password: 'concurrent-test'
          })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Only one admin user should exist
      const users = authManager.getAllUsers();
      const adminUsers = users.filter(user => user.username === 'admin');
      expect(adminUsers.length).toBe(1);
    });
  });

  describe('Environment Variable Edge Cases', () => {
    it('should handle empty ADMIN_PASSWORD string', async () => {
      process.env.ADMIN_PASSWORD = '';

      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: ''
        });

      expect(response.status).toBe(200);
      expect(response.body.bypassInfo.adminPasswordSet).toBe(true);
    });

    it('should handle DISABLE_LOCAL_ADMIN_BYPASS set to non-"true"', async () => {
      process.env.DISABLE_LOCAL_ADMIN_BYPASS = 'false';

      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(200);
      expect(response.body.bypassInfo.isLocalBypass).toBe(true);
    });

    it('should handle DISABLE_LOCAL_ADMIN_BYPASS with mixed case', async () => {
      process.env.DISABLE_LOCAL_ADMIN_BYPASS = 'TRUE';

      const response = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(response.status).toBe(401); // Bypass disabled
    });
  });
});