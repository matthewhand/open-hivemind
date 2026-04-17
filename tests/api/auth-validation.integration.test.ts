import express from 'express';
import request from 'supertest';
import authRouter from '../../src/server/routes/auth';

describe('Auth Validation Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);
  });

  describe('POST /auth/login Validation', () => {
    it('returns 400 when missing required fields', async () => {
      // Zod validation should catch this before it reaches AuthManager
      const res = await request(app).post('/auth/login').send({ username: 'test' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/register Validation', () => {
    it('returns 400 for invalid username/password lengths', async () => {
      const res = await request(app).post('/auth/register').send({
        username: 'a', // Too short
        password: '123', // Too short
        email: 'test@example.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.issues)).toBe(true);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app).post('/auth/register').send({
        username: 'validuser',
        password: 'ValidPassword123!',
        email: 'not-an-email',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
