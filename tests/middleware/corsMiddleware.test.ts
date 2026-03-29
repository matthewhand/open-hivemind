import { applyCors, getCorsOrigins } from '../../src/middleware/corsMiddleware';
import type { Request, Response, NextFunction } from 'express';

describe('corsMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
      method: 'GET',
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };
    next = jest.fn();

    // Clear mock data
    jest.clearAllMocks();
  });

  describe('getCorsOrigins', () => {
    it('returns an array of allowed origins', () => {
      const origins = getCorsOrigins();
      expect(Array.isArray(origins)).toBe(true);
    });
  });

  describe('applyCors', () => {
    it('handles OPTIONS preflight without origin', () => {
      req.method = 'OPTIONS';

      applyCors(req as Request, res as Response, next as NextFunction);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('handles OPTIONS preflight with allowed origin', () => {
      req.method = 'OPTIONS';
      const origins = getCorsOrigins();
      expect(origins.length).toBeGreaterThan(0);
      req.headers = { origin: origins[0] };

      applyCors(req as Request, res as Response, next as NextFunction);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', origins[0]);
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('handles OPTIONS preflight with unallowed origin', () => {
      req.method = 'OPTIONS';
      req.headers = { origin: 'http://evil.com' };

      applyCors(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'CORS origin not allowed' });
    });

    it('handles GET request without origin', () => {
      applyCors(req as Request, res as Response, next as NextFunction);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(next).toHaveBeenCalled();
    });

    it('handles GET request with allowed origin', () => {
      const origins = getCorsOrigins();
      expect(origins.length).toBeGreaterThan(0);
      req.headers = { origin: origins[0] };

      applyCors(req as Request, res as Response, next as NextFunction);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', origins[0]);
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(next).toHaveBeenCalled();
    });

    it('handles GET request with unallowed origin', () => {
      req.headers = { origin: 'http://evil.com' };

      applyCors(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'CORS origin not allowed' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
