import { Request, Response, NextFunction } from 'express';
import { requireTenant } from '../../../src/auth/middleware';

describe('requireTenant Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it('should call next() without arguments', () => {
    requireTenant(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
