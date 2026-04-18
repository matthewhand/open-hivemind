import express from 'express';
import request from 'supertest';
import { body } from 'express-validator';
import { z } from 'zod';
import { validate, commonValidations } from '../../src/middleware/validationMiddleware';
import { validateRequest } from '../../src/validation/validateRequest';

describe('Validation Integration', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('express-validator (validate)', () => {
    beforeEach(() => {
      app.post('/test-ev', [
        body('email').isEmail(),
        body('username').isLength({ min: 3 }),
        validate
      ], (req: express.Request, res: express.Response) => {
        res.status(200).json({ success: true });
      });
    });

    it('should pass with valid data', async () => {
      const response = await request(app)
        .post('/test-ev')
        .send({ email: 'test@example.com', username: 'tester' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should fail with invalid data and return 400', async () => {
      const response = await request(app)
        .post('/test-ev')
        .send({ email: 'not-an-email', username: 'hi' });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBe(2);
    });
  });

  describe('commonValidations', () => {
    it('should validate common patterns correctly using validate middleware', async () => {
      app.post('/test-common', [
        commonValidations.email(),
        commonValidations.username(),
        validate
      ], (req: express.Request, res: express.Response) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/test-common')
        .send({ email: 'valid@example.com', username: 'valid_user' });
      
      expect(response.status).toBe(200);
    });
  });

  describe('Zod (validateRequest)', () => {
    const schema = z.object({
      body: z.object({
        name: z.string().min(1),
        age: z.number().positive(),
      }),
      query: z.object({
        detailed: z.string().optional(),
      })
    });

    beforeEach(() => {
      app.post('/test-zod', validateRequest(schema), (req: express.Request, res: express.Response) => {
        res.status(200).json({ success: true });
      });
    });

    it('should pass with valid Zod schema data', async () => {
      const response = await request(app)
        .post('/test-zod')
        .send({ name: 'Bot', age: 10 });
      
      expect(response.status).toBe(200);
    });

    it('should fail with invalid Zod data and return consistent error structure', async () => {
      const response = await request(app)
        .post('/test-zod')
        .send({ name: '', age: -5 });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBe(2);
    });

    it('should validate query parameters with Zod', async () => {
      const response = await request(app)
        .post('/test-zod?detailed=true')
        .send({ name: 'Bot', age: 10 });
      
      expect(response.status).toBe(200);
    });
  });
});
