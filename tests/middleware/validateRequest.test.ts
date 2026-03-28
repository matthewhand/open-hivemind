import { z } from 'zod';
import { validateRequest } from '../../src/validation/validateRequest';

describe('validateRequest middleware', () => {
  const mockNext = jest.fn();
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { body: {}, query: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should call next() when validation passes', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
    });

    mockReq.body = { name: 'test-bot' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 400 with structured error when body validation fails', () => {
    const schema = z.object({
      body: z.object({
        name: z.string().min(1, { message: 'Name is required' }),
      }),
    });

    mockReq.body = { name: '' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        issues: expect.arrayContaining([
          expect.objectContaining({
            message: 'Name is required',
          }),
        ]),
      })
    );
  });

  it('should return 400 when required body field is missing', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
    });

    mockReq.body = { name: 'test' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        issues: expect.any(Array),
      })
    );
  });

  it('should validate params correctly', () => {
    const schema = z.object({
      params: z.object({
        id: z.string().min(1, { message: 'ID is required' }),
      }),
    });

    mockReq.params = { id: '' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        issues: expect.arrayContaining([
          expect.objectContaining({
            message: 'ID is required',
          }),
        ]),
      })
    );
  });

  it('should validate query parameters correctly', () => {
    const schema = z.object({
      query: z.object({
        limit: z.string().regex(/^\d+$/),
      }),
    });

    mockReq.query = { limit: 'abc' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should pass when params are valid', () => {
    const schema = z.object({
      params: z.object({
        id: z.string().min(1),
      }),
    });

    mockReq.params = { id: 'abc-123' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should validate combined body, params, and query', () => {
    const schema = z.object({
      params: z.object({
        id: z.string().min(1),
      }),
      body: z.object({
        name: z.string().min(1),
      }),
      query: z.object({
        format: z.string().optional(),
      }),
    });

    mockReq.params = { id: 'abc' };
    mockReq.body = { name: 'test' };
    mockReq.query = { format: 'json' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should forward non-Zod errors to next()', () => {
    // Create a schema that will throw a non-Zod error
    const schema = {
      parse: () => {
        throw new Error('unexpected error');
      },
    } as any;

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return multiple validation issues when multiple fields fail', () => {
    const schema = z.object({
      body: z.object({
        name: z.string().min(1, { message: 'Name is required' }),
        email: z.string().email({ message: 'Valid email is required' }),
      }),
    });

    mockReq.body = { name: '', email: 'not-an-email' };

    validateRequest(schema)(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    const jsonCall = mockRes.json.mock.calls[0][0];
    expect(jsonCall.error).toBe('Validation failed');
    expect(jsonCall.issues.length).toBeGreaterThanOrEqual(2);
  });
});
