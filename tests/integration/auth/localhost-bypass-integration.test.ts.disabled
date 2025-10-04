/**
 * Integration Tests for Localhost Admin Authentication Bypass
 *
 * These tests verify the complete end-to-end functionality of the localhost admin bypass
 * feature, including frontend integration, API interactions, and real-world scenarios.
 */

import request from 'supertest';
import { app } from '../../../src/index';

describe('Localhost Admin Bypass - Integration Tests', () => {
  let accessToken: string;
  let refreshToken: string;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.ADMIN_PASSWORD;
    delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;
  });

  afterEach(() => {
    accessToken = '';
    refreshToken = '';
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full authentication cycle with localhost bypass', async () => {
      // Step 1: Login via localhost bypass
      const loginResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'integration-test-password'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.bypassInfo.isLocalBypass).toBe(true);

      accessToken = loginResponse.body.data.accessToken;
      refreshToken = loginResponse.body.data.refreshToken;

      // Step 2: Verify user profile
      const profileResponse = await request(app)
        .get('/webui/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.user.username).toBe('admin');
      expect(profileResponse.body.data.user.role).toBe('admin');

      // Step 3: Check user permissions
      const permissionsResponse = await request(app)
        .get('/webui/api/auth/permissions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(permissionsResponse.status).toBe(200);
      expect(permissionsResponse.body.data.role).toBe('admin');
      expect(Array.isArray(permissionsResponse.body.data.permissions)).toBe(true);

      // Step 4: Logout
      const logoutResponse = await request(app)
        .post('/webui/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      // Step 5: Verify token is now invalid
      const failedProfileResponse = await request(app)
        .get('/webui/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(failedProfileResponse.status).toBe(401);
    });

    it('should handle token refresh after bypass login', async () => {
      // Login via localhost bypass
      const loginResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'refresh-test-password'
        });

      refreshToken = loginResponse.body.data.refreshToken;

      // Refresh the token
      const refreshResponse = await request(app)
        .post('/webui/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();

      const newAccessToken = refreshResponse.body.data.accessToken;

      // Verify new token works
      const profileResponse = await request(app)
        .get('/webui/api/auth/me')
        .set('Authorization', `Bearer ${newAccessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.user.username).toBe('admin');
    });
  });

  describe('ADMIN_PASSWORD Integration', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'secure-integration-pass-123';
    });

    it('should maintain admin session across multiple requests', async () => {
      // Login with ADMIN_PASSWORD
      const loginResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'secure-integration-pass-123'
        });

      accessToken = loginResponse.body.data.accessToken;

      // Make multiple authenticated requests
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/webui/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.user.username).toBe('admin');
        expect(response.body.data.user.role).toBe('admin');
      });
    });

    it('should integrate with user management endpoints', async () => {
      // Login as admin via bypass
      const loginResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'secure-integration-pass-123'
        });

      accessToken = loginResponse.body.data.accessToken;

      // Create a test user
      const createUserResponse = await request(app)
        .post('/webui/api/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'testpassword123'
        });

      expect(createUserResponse.status).toBe(201);
      expect(createUserResponse.body.success).toBe(true);

      // List all users
      const usersResponse = await request(app)
        .get('/webui/api/auth/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(usersResponse.status).toBe(200);
      expect(usersResponse.body.data.users).toBeDefined();
      expect(Array.isArray(usersResponse.body.data.users)).toBe(true);

      // Verify admin user exists in the list
      const adminUser = usersResponse.body.data.users.find((user: any) => user.username === 'admin');
      expect(adminUser).toBeDefined();
      expect(adminUser.role).toBe('admin');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should simulate developer environment setup', async () => {
      // Simulate developer starting app locally without ADMIN_PASSWORD
      const devLoginResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'dev-password'
        });

      expect(devLoginResponse.status).toBe(200);
      expect(devLoginResponse.body.bypassInfo.adminPasswordSet).toBe(false);
      expect(devLoginResponse.body.bypassInfo.note).toContain('localhost bypass');

      accessToken = devLoginResponse.body.data.accessToken;

      // Developer accesses admin functionality
      const permissionsResponse = await request(app)
        .get('/webui/api/auth/permissions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(permissionsResponse.status).toBe(200);
      expect(permissionsResponse.body.data.role).toBe('admin');
    });

    it('should simulate production deployment with security', async () => {
      // Simulate production environment with ADMIN_PASSWORD set
      process.env.ADMIN_PASSWORD = 'prod-secure-pass-456';
      process.env.DISABLE_LOCAL_ADMIN_BYPASS = 'true';

      // Localhost bypass should be disabled
      const bypassResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'any-password'
        });

      expect(bypassResponse.status).toBe(401);

      // Remove DISABLE_LOCAL_ADMIN_BYPASS to allow ADMIN_PASSWORD usage
      delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;

      // Now ADMIN_PASSWORD should work
      const adminPassResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'prod-secure-pass-456'
        });

      expect(adminPassResponse.status).toBe(200);
      expect(adminPassResponse.body.bypassInfo.adminPasswordSet).toBe(true);
      expect(adminPassResponse.body.bypassInfo.note).toContain('ADMIN_PASSWORD');
    });

    it('should handle Docker/containerized environment', async () => {
      // Simulate Docker container with internal networking
      process.env.ADMIN_PASSWORD = 'docker-admin-pass';

      // Test with different container IP ranges
      const containerIPs = ['172.17.0.1', '172.18.0.1', '172.19.0.1'];

      for (const ip of containerIPs) {
        const response = await request(app)
          .post('/webui/api/auth/login')
          .set('X-Forwarded-For', ip)
          .send({
            username: 'admin',
            password: 'docker-admin-pass'
          });

        // Container IPs should not get bypass
        expect(response.status).toBe(401);
      }

      // But localhost should still work with ADMIN_PASSWORD
      const localhostResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'docker-admin-pass'
        });

      expect(localhostResponse.status).toBe(200);
    });
  });

  describe('Concurrent User Management', () => {
    it('should handle multiple admin sessions from localhost', async () => {
      const sessions = [];

      // Create multiple admin sessions
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/webui/api/auth/login')
          .set('X-Forwarded-For', '127.0.0.1')
          .send({
            username: 'admin',
            password: `session-${i}-password`
          });

        expect(response.status).toBe(200);
        sessions.push({
          accessToken: response.body.data.accessToken,
          refreshToken: response.body.data.refreshToken
        });
      }

      // All sessions should be valid
      for (const session of sessions) {
        const profileResponse = await request(app)
          .get('/webui/api/auth/me')
          .set('Authorization', `Bearer ${session.accessToken}`);

        expect(profileResponse.status).toBe(200);
        expect(profileResponse.body.data.user.username).toBe('admin');
      }

      // Logout all sessions
      for (const session of sessions) {
        const logoutResponse = await request(app)
          .post('/webui/api/auth/logout')
          .set('Authorization', `Bearer ${session.accessToken}`)
          .send({ refreshToken: session.refreshToken });

        expect(logoutResponse.status).toBe(200);
      }
    });

    it('should handle admin password changes across sessions', async () => {
      process.env.ADMIN_PASSWORD = 'initial-admin-pass';

      // Create first session
      const firstSessionResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'initial-admin-pass'
        });

      expect(firstSessionResponse.status).toBe(200);
      const firstToken = firstSessionResponse.body.data.accessToken;

      // Change ADMIN_PASSWORD
      process.env.ADMIN_PASSWORD = 'new-admin-pass';

      // New session should require new password
      const newSessionResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'new-admin-pass'
        });

      expect(newSessionResponse.status).toBe(200);
      const newToken = newSessionResponse.body.data.accessToken;

      // Both tokens should still work (existing sessions aren't invalidated)
      const firstProfileResponse = await request(app)
        .get('/webui/api/auth/me')
        .set('Authorization', `Bearer ${firstToken}`);

      const newProfileResponse = await request(app)
        .get('/webui/api/auth/me')
        .set('Authorization', `Bearer ${newToken}`);

      expect(firstProfileResponse.status).toBe(200);
      expect(newProfileResponse.status).toBe(200);
    });
  });

  describe('Security and Validation', () => {
    it('should prevent admin bypass from external networks', async () => {
      const externalIPs = [
        '192.168.1.100',
        '10.0.0.50',
        '203.0.113.1',
        '198.51.100.1'
      ];

      for (const ip of externalIPs) {
        const response = await request(app)
          .post('/webui/api/auth/login')
          .set('X-Forwarded-For', ip)
          .send({
            username: 'admin',
            password: 'any-password'
          });

        expect(response.status).toBe(401);
        expect(response.body.bypassInfo).toBeUndefined();
      }
    });

    it('should handle malformed X-Forwarded-For headers', async () => {
      const malformedHeaders = [
        '',
        'invalid-ip',
        '300.400.500.600',
        'localhost.com',
        '127.0.0.1 extra stuff'
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .post('/webui/api/auth/login')
          .set('X-Forwarded-For', header)
          .send({
            username: 'admin',
            password: 'any-password'
          });

        // Should not crash, should treat as non-localhost
        expect([400, 401]).toContain(response.status);
      }
    });

    it('should maintain security after failed bypass attempts', async () => {
      // Multiple failed attempts from external IP
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/webui/api/auth/login')
          .set('X-Forwarded-For', '192.168.1.100')
          .send({
            username: 'admin',
            password: `attempt-${i}`
          });

        expect(response.status).toBe(401);
      }

      // Localhost should still work
      const localhostResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'final-test-password'
        });

      expect(localhostResponse.status).toBe(200);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid successive login attempts', async () => {
      const promises = Array(10).fill(null).map((_, index) =>
        request(app)
          .post('/webui/api/auth/login')
          .set('X-Forwarded-For', '127.0.0.1')
          .send({
            username: 'admin',
            password: `rapid-test-${index}`
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // But only one admin user should exist
      const usersResponse = await request(app)
        .get('/webui/api/auth/users')
        .set('Authorization', `Bearer ${responses[0].body.data.accessToken}`);

      const adminUsers = usersResponse.body.data.users.filter((user: any) => user.username === 'admin');
      expect(adminUsers.length).toBe(1);
    });

    it('should handle long-running admin sessions', async () => {
      // Login and simulate long session
      const loginResponse = await request(app)
        .post('/webui/api/auth/login')
        .set('X-Forwarded-For', '127.0.0.1')
        .send({
          username: 'admin',
          password: 'long-session-password'
        });

      accessToken = loginResponse.body.data.accessToken;

      // Simulate multiple API calls over time
      for (let i = 0; i < 10; i++) {
        const profileResponse = await request(app)
          .get('/webui/api/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(profileResponse.status).toBe(200);
        expect(profileResponse.body.data.user.username).toBe('admin');

        // Small delay to simulate time passing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });
  });
});