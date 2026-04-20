import { Request, Response, NextFunction } from 'express';
import { quotaMiddleware, extractIdentity } from '../../../src/middleware/quotaMiddleware';

describe('quotaMiddleware', () => {
  describe('extractIdentity', () => {
    it('should extract identity from req.user', () => {
      const req = { user: { id: 'user-123' } } as any;
      const result = extractIdentity(req);
      expect(result).toEqual({ entityId: 'user-123', entityType: 'user' });
    });

    it('should extract identity from x-bot-id header', () => {
      const req = { headers: { 'x-bot-id': 'bot-456' } } as any;
      const result = extractIdentity(req);
      expect(result).toEqual({ entityId: 'bot-456', entityType: 'bot' });
    });

    it('should fallback to IP address', () => {
      const req = { ip: '1.2.3.4', headers: {} } as any;
      const result = extractIdentity(req);
      expect(result).toEqual({ entityId: '1.2.3.4', entityType: 'user' });
    });
  });

  describe('middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
      process.env.NODE_ENV = 'development'; // avoid skipping in test env if we want to test it
      delete process.env.DISABLE_QUOTA;
    });

    it('should skip if NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test';
      quotaMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should skip if DISABLE_QUOTA is true', () => {
      process.env.DISABLE_QUOTA = 'true';
      quotaMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
