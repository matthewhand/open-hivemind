import { type Request, type Response } from 'express';

const isTestEnv = process.env.NODE_ENV === 'test';

// Apply rate limiting to configuration endpoints
const rateLimit = require('express-rate-limit').default;
export const configRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many configuration attempts, please try again later.',
      standardHeaders: true,
    });
