import { ApiResponse } from '../../src/server/utils/apiResponse';

describe('ApiResponse Utility', () => {
  describe('success', () => {
    it('should return a success envelope with data', () => {
      const data = { id: 1, name: 'Test' };
      const response = ApiResponse.success(data);

      expect(response).toEqual({
        success: true,
        data: data,
      });
    });

    it('should return a success envelope without data if omitted', () => {
      const response = ApiResponse.success();

      expect(response).toEqual({
        success: true,
        data: undefined,
      });
    });
  });

  describe('error', () => {
    it('should return an error envelope with message, code, and details', () => {
      const response = ApiResponse.error('Internal Server Error', 'ERR_500', { statusCode: 500 });

      expect(response).toEqual({
        success: false,
        error: 'Internal Server Error',
        code: 'ERR_500',
        details: { statusCode: 500 },
      });
    });

    it('should return an error envelope without code if omitted', () => {
      const response = ApiResponse.error('Not Found');

      expect(response).toEqual({
        success: false,
        error: 'Not Found',
      });
    });

    it('should return an error envelope with code but no details', () => {
      const response = ApiResponse.error('Bad Request', 'VALIDATION_ERROR');

      expect(response).toEqual({
        success: false,
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
      });
    });

    it('should include details when provided', () => {
      const issues = [{ path: 'name', message: 'required' }];
      const response = ApiResponse.error('Validation failed', 'VALIDATION_ERROR', issues);

      expect(response).toEqual({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: issues,
      });
    });
  });
});
