import express, { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import request from 'supertest';
import { validate } from '../../../src/middleware/validationMiddleware';

describe('Input Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Add test route with validation
    app.post(
      '/test',
      [
        body('username').isEmail().withMessage('Invalid email'),
        body('password').isLength({ min: 8 }).withMessage('Password too short'),
      ],
      validate,
      (req: Request, res: Response) => {
        res.status(200).json({ message: 'Success' });
      }
    );

    // Add route without validation for comparison
    app.post('/no-validation', (req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });
  });

  test('should reject invalid input with proper errors', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        username: 'invalid-email',
        password: 'short',
      })
      .expect(400);

    // Check that errors array exists and contains expected validation errors
    expect(response.body.errors).toBeDefined();
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBe(2);

    // Check for username error
    const usernameError = response.body.errors.find((e: any) => e.path === 'username');
    expect(usernameError).toBeDefined();
    expect(usernameError.msg).toBe('Invalid email');

    // Check for password error
    const passwordError = response.body.errors.find((e: any) => e.path === 'password');
    expect(passwordError).toBeDefined();
    expect(passwordError.msg).toBe('Password too short');
  });

  test('should accept valid input', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        username: 'valid@example.com',
        password: 'longenoughpassword',
      })
      .expect(200);

    expect(response.body.message).toBe('Success');
  });

  test('should allow requests to non-validated endpoints', async () => {
    const response = await request(app).post('/no-validation').send({ any: 'data' }).expect(200);

    expect(response.body.message).toBe('Success');
  });

  test('should handle missing required fields', async () => {
    const response = await request(app).post('/test').send({}).expect(400);

    // Check that errors array exists and has errors
    expect(response.body.errors).toBeDefined();
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThanOrEqual(2);

    // Check for username error
    const usernameError = response.body.errors.find((e: any) => e.path === 'username');
    expect(usernameError).toBeDefined();

    // Check for password error
    const passwordError = response.body.errors.find((e: any) => e.path === 'password');
    expect(passwordError).toBeDefined();
  });
});
