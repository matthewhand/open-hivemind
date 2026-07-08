import { NextFunction, Request, Response } from 'express';
import {
  correlationIdMiddleware,
  generateCorrelationId,
  getCorrelationId,
} from '../../../src/middleware/correlationId';

describe('correlationIdMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('should generate a new correlation ID if none provided', () => {
    correlationIdMiddleware(req as Request, res as Response, next);

    expect(req.correlationId).toBeDefined();
    expect(req.correlationId).toMatch(/^corr_/);
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', req.correlationId);
    expect(next).toHaveBeenCalled();
  });

  it('should use existing X-Correlation-ID from headers', () => {
    req.headers!['x-correlation-id'] = 'existing-id';
    correlationIdMiddleware(req as Request, res as Response, next);

    expect(req.correlationId).toBe('existing-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-id');
  });

  it('should use existing X-Request-ID from headers', () => {
    req.headers!['x-request-id'] = 'request-id';
    correlationIdMiddleware(req as Request, res as Response, next);

    expect(req.correlationId).toBe('request-id');
  });

  it('should make correlation ID available via getCorrelationId in next()', () => {
    let capturedId: string | undefined;
    const nextWithCheck = () => {
      capturedId = getCorrelationId();
    };

    correlationIdMiddleware(req as Request, res as Response, nextWithCheck);
    expect(capturedId).toBe(req.correlationId);
  });
});
