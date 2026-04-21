import { beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/index';
import { AuthManager } from '../../../src/auth/AuthManager';

describe('Audit Logging & Monitoring Integration Tests', () => {
  const authManager = AuthManager.getInstance();
  let adminToken: string;

  beforeAll(async () => {
     // Register an admin
     try {
       await authManager.register({
         username: 'audit-admin',
         password: 'password123',
         email: 'audit@example.com',
         role: 'admin'
       });
     } catch (e) {}

     const adminLogin = await request(app)
       .post('/api/auth/login')
       .send({ username: 'audit-admin', password: 'password123' });
     adminToken = adminLogin.body.data?.accessToken;
  });

  it('should allow admins to access audit logs', async () => {
    expect(adminToken).toBeDefined();
    const response = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('should allow access to health alerts', async () => {
    const response = await request(app)
      .get('/api/health/alerts');

    expect(response.status).toBe(200);
  });
});
