import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';
import {
  correlationIdMiddleware,
  correlationStorage,
  generateCorrelationId,
  getCorrelationContext,
  getCorrelationId,
} from '../../src/middleware/correlationId';

/**
 * Helper to create minimal Express-like mock objects.
 */
function createMockRequestResponse(headers: Record<string, string> = {}): {
  req: Partial<Request>;
  res: Partial<Response>;
} {
  const lowerHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lowerHeaders[k.toLowerCase()] = v;
  }

  const responseHeaders: Record<string, string> = {};

  return {
    req: {
      headers: lowerHeaders,
      method: 'GET',
      path: '/test',
    } as unknown as Request,
    res: {
      setHeader: jest.fn((name: string, value: string) => {
        responseHeaders[name] = value;
        return undefined as any;
      }),
      getHeader: jest.fn((name: string) => responseHeaders[name]),
    } as unknown as Response,
  };
}

describe('correlationIdMiddleware', () => {
  it('generates a correlation ID when none is provided in headers', (done) => {
    const { req, res } = createMockRequestResponse();

    const next: NextFunction = () => {
      try {
        // req.correlationId should be set
        expect((req as any).correlationId).toMatch(/^corr_/);

        // Response header should be set
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-Correlation-ID',
          (req as any).correlationId
        );

        done();
      } catch (err) {
        done(err);
      }
    };

    correlationIdMiddleware(req as Request, res as Response, next);
  });

  it('passes through an existing X-Correlation-ID header', (done) => {
    const existingId = 'my-existing-id-123';
    const { req, res } = createMockRequestResponse({
      'X-Correlation-ID': existingId,
    });

    const next: NextFunction = () => {
      try {
        expect((req as any).correlationId).toBe(existingId);
        expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', existingId);
        done();
      } catch (err) {
        done(err);
      }
    };

    correlationIdMiddleware(req as Request, res as Response, next);
  });

  it('passes through an existing X-Request-ID header when X-Correlation-ID is absent', (done) => {
    const requestId = 'req-id-456';
    const { req, res } = createMockRequestResponse({
      'X-Request-ID': requestId,
    });

    const next: NextFunction = () => {
      try {
        expect((req as any).correlationId).toBe(requestId);
        done();
      } catch (err) {
        done(err);
      }
    };

    correlationIdMiddleware(req as Request, res as Response, next);
  });

  it('sets the X-Correlation-ID response header', (done) => {
    const { req, res } = createMockRequestResponse();

    const next: NextFunction = () => {
      try {
        expect(res.setHeader).toHaveBeenCalledWith(
          'X-Correlation-ID',
          expect.any(String)
        );
        done();
      } catch (err) {
        done(err);
      }
    };

    correlationIdMiddleware(req as Request, res as Response, next);
  });

  it('makes correlation ID available via AsyncLocalStorage in nested calls', (done) => {
    const { req, res } = createMockRequestResponse();

    const next: NextFunction = () => {
      try {
        // getCorrelationId() should return the same ID that was set on req
        const idFromStorage = getCorrelationId();
        expect(idFromStorage).toBe((req as any).correlationId);

        // Full context should also be available
        const ctx = getCorrelationContext();
        expect(ctx).not.toBeUndefined();
        expect(ctx!.correlationId).toBe((req as any).correlationId);
        expect(typeof ctx!.startTime).toBe('number');

        done();
      } catch (err) {
        done(err);
      }
    };

    correlationIdMiddleware(req as Request, res as Response, next);
  });

  it('makes correlation ID available in deeply nested async calls', (done) => {
    const existingId = 'deep-async-test-789';
    const { req, res } = createMockRequestResponse({
      'X-Correlation-ID': existingId,
    });

    const next: NextFunction = async () => {
      try {
        // Simulate a deeply nested async call
        const result = await new Promise<string | undefined>((resolve) => {
          setTimeout(() => {
            resolve(getCorrelationId());
          }, 10);
        });

        expect(result).toBe(existingId);
        done();
      } catch (err) {
        done(err);
      }
    };

    correlationIdMiddleware(req as Request, res as Response, next);
  });

  it('returns undefined from getCorrelationId() outside a request context', () => {
    const id = getCorrelationId();
    expect(id).toBeUndefined();
  });

  it('sets req.startTime', (done) => {
    const { req, res } = createMockRequestResponse();
    const before = Date.now();

    const next: NextFunction = () => {
      try {
        expect((req as any).startTime).toBeGreaterThanOrEqual(before);
        expect((req as any).startTime).toBeLessThanOrEqual(Date.now());
        done();
      } catch (err) {
        done(err);
      }
    };

    correlationIdMiddleware(req as Request, res as Response, next);
  });
});

describe('generateCorrelationId', () => {
  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateCorrelationId()));
    expect(ids.size).toBe(100);
  });

  it('follows the expected format', () => {
    const id = generateCorrelationId();
    expect(id).toMatch(/^corr_\d+_[a-f0-9]{16}$/);
  });
});
