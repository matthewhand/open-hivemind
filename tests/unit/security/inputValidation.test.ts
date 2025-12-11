import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { validate } from '../../../src/middleware/validationMiddleware';

describe('Input Validation Middleware', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Add test route with validation
    app.post('/test', [
      body('username').isEmail().withMessage('Invalid email'),
      body('password').isLength({ min: 8 }).withMessage('Password too short'),
    ], validate, (req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });
    
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
        password: 'short'
      })
      .expect(400);
    
    expect(response.body.errors).toEqual([
      { path: 'username', msg: 'Invalid email' },
      { path: 'password', msg: 'Password too short' }
    ]);
  });

  test('should accept valid input', async () => {
    const response = await request(app)
      .post('/test')
      .send({
        username: 'valid@example.com',
        password: 'longenoughpassword'
      })
      .expect(200);
    
    expect(response.body.message).toBe('Success');
  });

  test('should allow requests to non-validated endpoints', async () => {
    const response = await request(app)
      .post('/no-validation')
      .send({ any: 'data' })
      .expect(200);
    
    expect(response.body.message).toBe('Success');
  });

  test('should handle missing required fields', async () => {
    const response = await request(app)
      .post('/test')
      .send({})
      .expect(400);
    
    expect(response.body.errors).toEqual([
      { path: 'username', msg: 'Invalid value' },
      { path: 'password', msg: 'Invalid value' }
    ]);
  });
});