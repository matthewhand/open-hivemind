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
    it('should return an error envelope with message and code', () => {
      const response = ApiResponse.error('Internal Server Error', 'ERR_500', 500);

      expect(response).toEqual({
        success: false,
        error: 'Internal Server Error',
        code: 'ERR_500',
      });
    });

    it('should return an error envelope without code if omitted', () => {
      const response = ApiResponse.error('Not Found');

      expect(response).toEqual({
        success: false,
        error: 'Not Found',
      });
    });
  });
});
