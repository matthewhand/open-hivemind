import { Request, Response, NextFunction } from 'express';
import sanitizeInput from '../../src/middleware/sanitizationMiddleware';

describe('sanitizationMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      params: {},
      headers: {},
    };
    res = {};
    next = jest.fn();
  });

  describe('string sanitization', () => {
    it('sanitizes malicious characters in strings', () => {
      req.body = {
        input: '<script>alert("xss")</script> & \'test\' \x00',
      };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.body).toEqual({
        input: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#x27;test&#x27; ',
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('object sanitization', () => {
    it('sanitizes deeply nested objects', () => {
      req.body = {
        level1: {
          level2: {
            input: '<div>"test"</div>',
          },
        },
        normal: 'value',
      };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.body).toEqual({
        level1: {
          level2: {
            input: '&lt;div&gt;&quot;test&quot;&lt;/div&gt;',
          },
        },
        normal: 'value',
      });
    });

    it('sanitizes arrays', () => {
      req.body = {
        list: ['<script>', 'safe', '<div>'],
      };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.body).toEqual({
        list: ['&lt;script&gt;', 'safe', '&lt;div&gt;'],
      });
    });

    it('handles null and undefined values properly', () => {
      req.body = {
        nullVal: null,
        undefVal: undefined,
        numberVal: 42,
        booleanVal: true,
      };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.body).toEqual({
        nullVal: null,
        undefVal: undefined,
        numberVal: 42,
        booleanVal: true,
      });
    });
  });

  describe('request properties sanitization', () => {
    it('sanitizes req.query', () => {
      req.query = { q: '<search>' };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.query).toEqual({ q: '&lt;search&gt;' });
    });

    it('sanitizes req.params', () => {
      req.params = { id: '<id>' };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.params).toEqual({ id: '&lt;id&gt;' });
    });
  });

  describe('headers sanitization', () => {
    it('skips standard headers', () => {
      req.headers = {
        'authorization': 'Bearer <token>',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 <script>',
      };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.headers).toEqual({
        'authorization': 'Bearer <token>',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0 <script>',
      });
    });

    it('sanitizes non-standard custom X- headers', () => {
      req.headers = {
        'x-custom-header': '<script>alert(1)</script>',
        'x-forwarded-for': '127.0.0.1', // this one is skipped
      };

      sanitizeInput(req as Request, res as Response, next as NextFunction);

      expect(req.headers).toEqual({
        'x-custom-header': '&lt;script&gt;alert(1)&lt;/script&gt;',
        'x-forwarded-for': '127.0.0.1',
      });
    });
  });

  it('handles requests missing body, query, params, or headers', () => {
    req = {}; // empty request

    sanitizeInput(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });
});
