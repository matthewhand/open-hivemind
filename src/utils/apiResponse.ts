import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data?: any, message?: string) {
    const response: any = { success: true };
    if (message) response.message = message;
    if (data !== undefined) response.data = data;
    return res.json(response);
  }

  static error(res: Response, message: string, statusCode = 500, error?: any) {
    const response: any = { success: false, message };
    if (error !== undefined) response.error = error;
    return res.status(statusCode).json(response);
  }

  static badRequest(res: Response, message = 'Bad Request', error?: any) {
    return ApiResponse.error(res, message, 400, error);
  }

  static unauthorized(res: Response, message = 'Unauthorized', error?: any) {
    return ApiResponse.error(res, message, 401, error);
  }

  static forbidden(res: Response, message = 'Forbidden', error?: any) {
    return ApiResponse.error(res, message, 403, error);
  }

  static notFound(res: Response, message = 'Not Found') {
    return ApiResponse.error(res, message, 404);
  }

  static serverError(res: Response, message = 'Internal Server Error', error?: any) {
    return ApiResponse.error(res, message, 500, error);
  }
}
