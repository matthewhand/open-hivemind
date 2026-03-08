import { validateRequest } from '@src/validation/validateRequest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

describe('validateRequest middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should call next() if validation passes', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
      query: z.object({}),
      params: z.object({}),
    });

    mockReq.body = { name: 'test' };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, nextFunction as NextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should return 400 and detailed validation issues if validation fails', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
      }),
    });

    mockReq.body = { name: 123 }; // Invalid type

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, nextFunction as NextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: expect.any(Array),
            message: expect.any(String),
          }),
        ]),
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 400 when query param fails validation', () => {
    const schema = z.object({
      body: z.object({}).optional(),
      query: z.object({ page: z.string().regex(/^\d+$/) }),
      params: z.object({}).optional(),
    });

    mockReq.query = { page: 'not-a-number' };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, nextFunction as NextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: expect.arrayContaining(['query', 'page']),
          }),
        ]),
      })
    );
  });

  it('should return all validation issues when multiple fields fail', () => {
    const schema = z.object({
      body: z.object({
        name: z.string(),
        age: z.number(),
      }),
    });

    mockReq.body = { name: 123, age: 'not-a-number' };

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, nextFunction as NextFunction);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
    expect(jsonCall.issues.length).toBeGreaterThanOrEqual(2);
    expect(jsonCall.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ['body', 'name'] }),
        expect.objectContaining({ path: ['body', 'age'] }),
      ])
    );
  });

  it('should return 400 when route param fails validation', () => {
    const schema = z.object({
      body: z.object({}).optional(),
      query: z.object({}).optional(),
      params: z.object({ id: z.string().uuid() }),
    });
    mockReq.params = { id: 'not-a-uuid' };
    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, nextFunction as NextFunction);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed',
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['params', 'id']) }),
        ]),
      })
    );
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should call next(error) for non-Zod errors', () => {
    const schema = {
      parse: jest.fn().mockImplementation(() => {
        throw new Error('Some unexpected error');
      }),
    } as unknown as z.AnyZodObject;

    const middleware = validateRequest(schema);
    middleware(mockReq as Request, mockRes as Response, nextFunction as NextFunction);

    expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
    expect(nextFunction.mock.calls[0][0].message).toBe('Some unexpected error');
    expect(mockRes.status).not.toHaveBeenCalled();
    expect(mockRes.json).not.toHaveBeenCalled();
  });
});
