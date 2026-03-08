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

  it('should return 400 and validation issues if validation fails', () => {
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
        issues: expect.any(Array),
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
