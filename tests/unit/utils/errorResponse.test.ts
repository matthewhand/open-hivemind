import {
  ErrorResponseBuilder,
  SuccessResponseBuilder,
  ErrorResponses,
  createErrorResponse,
  createSuccessResponse,
} from '@src/utils/errorResponse';
import { HTTP_STATUS } from '@src/types/constants';

describe('errorResponse', () => {
  describe('ErrorResponseBuilder', () => {
    it('builds a standard error response', () => {
      const error = { code: 'VALIDATION_ERROR', message: 'Bad input', type: 'validation' as const };
      const builder = new ErrorResponseBuilder(error, 'corr-123');
      const response = builder.build();

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('VALIDATION_ERROR');
      expect(response.error.message).toBe('Bad input');
      expect(response.error.correlationId).toBe('corr-123');
      expect(response.error.timestamp).toBeDefined();
    });

    it('includes details when present on error object', () => {
      const error = { code: 'ERR', message: 'msg', type: 'unknown', details: { field: 'name' } };
      const response = new ErrorResponseBuilder(error).build();
      expect(response.error.details).toEqual({ field: 'name' });
    });

    it('withRequest adds request information', () => {
      const error = { code: 'ERR', message: 'msg', type: 'unknown' };
      const response = new ErrorResponseBuilder(error)
        .withRequest('/api/test', 'POST', 'corr-1')
        .build();
      expect(response.request).toEqual({ path: '/api/test', method: 'POST', correlationId: 'corr-1' });
    });

    it('withDetails merges additional details', () => {
      const error = { code: 'ERR', message: 'msg', type: 'unknown', details: { a: 1 } };
      const response = new ErrorResponseBuilder(error).withDetails({ b: 2 }).build();
      expect(response.error.details).toEqual({ a: 1, b: 2 });
    });

    it('withMessage overrides the error message', () => {
      const error = { code: 'ERR', message: 'original', type: 'unknown' };
      const response = new ErrorResponseBuilder(error).withMessage('redacted').build();
      expect(response.error.message).toBe('redacted');
    });

    describe('getStatusCode', () => {
      const cases: [string, number][] = [
        ['VALIDATION_ERROR', 400],
        ['AUTH_ERROR', 401],
        ['AUTHZ_ERROR', 403],
        ['NOT_FOUND', 404],
        ['RATE_LIMIT_ERROR', 429],
        ['TIMEOUT_ERROR', 408],
        ['CONFIG_ERROR', 500],
        ['DATABASE_ERROR', 500],
        ['UNKNOWN_CODE', 500],
      ];

      it.each(cases)('maps error code %s to status %d', (code, expected) => {
        const error = { code, message: 'test', type: 'unknown' };
        const builder = new ErrorResponseBuilder(error);
        expect(builder.getStatusCode()).toBe(expected);
      });

      it('extracts status from NETWORK_ERROR details', () => {
        const error = {
          code: 'NETWORK_ERROR',
          message: 'net err',
          type: 'network',
          details: { response: { status: 502 } },
        };
        const builder = new ErrorResponseBuilder(error);
        expect(builder.getStatusCode()).toBe(502);
      });
    });
  });

  describe('SuccessResponseBuilder', () => {
    it('builds a success response with data and meta', () => {
      const builder = new SuccessResponseBuilder({ id: 1 }, 'corr-abc');
      const response = builder.build();

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ id: 1 });
      expect(response.meta?.correlationId).toBe('corr-abc');
      expect(response.meta?.timestamp).toBeDefined();
    });

    it('withMeta merges additional metadata', () => {
      const response = new SuccessResponseBuilder({})
        .withMeta({ version: '1.0' })
        .build();
      expect(response.meta?.version).toBe('1.0');
    });
  });

  describe('ErrorResponses convenience methods', () => {
    it('badRequest creates a 400-type error', () => {
      const resp = ErrorResponses.badRequest('Missing field').build();
      expect(resp.error.code).toBe('BAD_REQUEST');
      expect(resp.error.message).toBe('Missing field');
    });

    it('unauthorized uses default message', () => {
      const resp = ErrorResponses.unauthorized().build();
      expect(resp.error.message).toBe('Authentication required');
    });

    it('notFound includes resource name', () => {
      const resp = ErrorResponses.notFound('User').build();
      expect(resp.error.message).toBe('User not found');
    });

    it('tooManyRequests includes retry info in details', () => {
      const resp = ErrorResponses.tooManyRequests(30, 100).build();
      expect(resp.error.details).toEqual({ retryAfter: 30, limit: 100 });
    });

    it('timeout includes operation and duration', () => {
      const resp = ErrorResponses.timeout('fetchUser', 5000).build();
      expect(resp.error.message).toContain('fetchUser');
      expect(resp.error.message).toContain('5000');
    });

    it('validation includes field details', () => {
      const resp = ErrorResponses.validation('email', 'bad', 'string', ['use @']).build();
      expect(resp.error.details).toEqual({
        field: 'email',
        value: 'bad',
        expected: 'string',
        suggestions: ['use @'],
      });
    });
  });

  describe('createErrorResponse / createSuccessResponse', () => {
    it('createErrorResponse returns an ErrorResponseBuilder', () => {
      const builder = createErrorResponse({ code: 'E', message: 'm', type: 'unknown' });
      expect(builder).toBeInstanceOf(ErrorResponseBuilder);
    });

    it('createSuccessResponse returns a SuccessResponseBuilder', () => {
      const builder = createSuccessResponse({ ok: true });
      expect(builder).toBeInstanceOf(SuccessResponseBuilder);
    });
  });

  describe('HTTP_STATUS', () => {
    it('has correct common status codes', () => {
      expect(HTTP_STATUS.OK).toBe(200);
      expect(HTTP_STATUS.BAD_REQUEST).toBe(400);
      expect(HTTP_STATUS.INTERNAL_SERVER_ERROR).toBe(500);
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
    });
  });
});
