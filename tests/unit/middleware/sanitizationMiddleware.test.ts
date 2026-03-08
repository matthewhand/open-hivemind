import { NextFunction, Request, Response } from 'express';
import { sanitizeInput } from '../../../src/middleware/sanitizationMiddleware';

describe('sanitizeInput middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should sanitize simple string fields in body', () => {
    mockReq.body = {
      name: '<script>alert("xss")</script>',
      description: 'A "quote" & a \'single quote\'',
    };

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toEqual({
      name: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      description: 'A &quot;quote&quot; &amp; a &#x27;single quote&#x27;',
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should sanitize nested objects in body', () => {
    mockReq.body = {
      user: {
        profile: {
          bio: '<p>Malicious code</p>',
        },
      },
    };

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toEqual({
      user: {
        profile: {
          bio: '&lt;p&gt;Malicious code&lt;/p&gt;',
        },
      },
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should sanitize arrays in body', () => {
    mockReq.body = {
      tags: ['<script>', 'safe_tag', '&'],
      nested: [{ id: 1, name: '<b>bold</b>' }],
    };

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toEqual({
      tags: ['&lt;script&gt;', 'safe_tag', '&amp;'],
      nested: [{ id: 1, name: '&lt;b&gt;bold&lt;/b&gt;' }],
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should handle null and non-string values correctly', () => {
    mockReq.body = {
      id: 123,
      isActive: true,
      data: null,
      undefinedField: undefined,
    };

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toEqual({
      id: 123,
      isActive: true,
      data: null,
      undefinedField: undefined,
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should sanitize query parameters', () => {
    mockReq.query = {
      search: '<script>alert(1)</script>',
      filter: 'a & b',
    };

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.query).toEqual({
      search: '&lt;script&gt;alert(1)&lt;/script&gt;',
      filter: 'a &amp; b',
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should sanitize route parameters', () => {
    mockReq.params = {
      id: '<script>alert(1)</script>',
    };

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.params).toEqual({
      id: '&lt;script&gt;alert(1)&lt;/script&gt;',
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should do nothing if body, query, or params are not objects', () => {
    mockReq.body = 'not an object';
    mockReq.query = 'not an object' as any;
    mockReq.params = 'not an object' as any;

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toBe('not an object');
    expect(mockReq.query).toBe('not an object');
    expect(mockReq.params).toBe('not an object');
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should handle undefined body, query, and params', () => {
    mockReq = {};

    sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.body).toBeUndefined();
    expect(mockReq.query).toBeUndefined();
    expect(mockReq.params).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
