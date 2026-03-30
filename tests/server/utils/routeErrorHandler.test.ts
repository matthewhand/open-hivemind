import { handleRouteError } from '../../../src/server/utils/routeErrorHandler';

// Mock ErrorUtils from types/errors
jest.mock('../../../src/types/errors', () => ({
  ErrorUtils: {
    toHivemindError: jest.fn((error: any) => ({
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code || undefined,
      statusCode: (error as any)?.statusCode || undefined,
    })),
    classifyError: jest.fn(() => ({
      type: 'unknown',
      severity: 'error',
    })),
  },
}));

describe('handleRouteError', () => {
  let mockRes: any;
  let mockDebug: jest.Mock;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockDebug = jest.fn();
  });

  it('should respond with 500 by default', () => {
    const error = new Error('something broke');
    handleRouteError(error, mockRes, mockDebug, 'test error', 'DEFAULT_CODE');

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'something broke',
        code: 'DEFAULT_CODE',
        timestamp: expect.any(String),
      })
    );
  });

  it('should use error statusCode when available', () => {
    const error: any = new Error('not found');
    error.statusCode = 404;

    const { ErrorUtils } = require('../../../src/types/errors');
    ErrorUtils.toHivemindError.mockReturnValueOnce({
      message: 'not found',
      statusCode: 404,
      code: 'NOT_FOUND',
    });

    handleRouteError(error, mockRes, mockDebug, 'route err', 'DEFAULT');
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('should use error code over default code when available', () => {
    const { ErrorUtils } = require('../../../src/types/errors');
    ErrorUtils.toHivemindError.mockReturnValueOnce({
      message: 'auth failed',
      code: 'AUTH_FAILED',
      statusCode: 401,
    });

    handleRouteError(new Error('auth'), mockRes, mockDebug, 'auth err', 'DEFAULT');
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AUTH_FAILED' }));
  });

  it('should include success:false when includeSuccess is true', () => {
    handleRouteError(new Error('err'), mockRes, mockDebug, 'msg', 'CODE', true);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('should NOT include success field when includeSuccess is false', () => {
    handleRouteError(new Error('err'), mockRes, mockDebug, 'msg', 'CODE', false);
    const call = mockRes.json.mock.calls[0][0];
    expect(call).not.toHaveProperty('success');
  });

  it('should call debug with error details', () => {
    handleRouteError(new Error('x'), mockRes, mockDebug, 'debug msg', 'CODE');
    expect(mockDebug).toHaveBeenCalledWith('debug msg', expect.any(Object));
  });
});
