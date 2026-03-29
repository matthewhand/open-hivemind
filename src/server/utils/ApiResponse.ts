import { Response } from 'express';

export interface ApiResponseShape<T = any> {
  success: boolean;
  error?: string;
  code?: string;
  data?: T;
  message?: string; // Optional message since some clients expect it
  [key: string]: any; // Allow additional fields like pagination
}

export class ApiResponse {
  /**
   * Send a success response.
   * @param res Express Response object
   * @param data Optional payload data
   * @param statusCode HTTP status code (default: 200)
   * @param extra Optional extra properties to include at the top level
   */
  static success<T>(
    res: Response,
    data?: T,
    statusCode: number = 200,
    extra: Record<string, any> = {}
  ): void {
    const response: ApiResponseShape<T> = {
      success: true,
      ...extra,
    };

    if (data !== undefined) {
      response.data = data;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Send an error response.
   * @param res Express Response object
   * @param error Error message
   * @param statusCode HTTP status code (default: 500)
   * @param code Optional internal error code
   * @param extra Optional extra properties to include at the top level
   */
  static error(
    res: Response,
    error: string,
    statusCode: number = 500,
    code?: string,
    extra: Record<string, any> = {}
  ): void {
    const response: ApiResponseShape = {
      success: false,
      error,
      ...extra,
    };

    if (code) {
      response.code = code;
    }

    res.status(statusCode).json(response);
  }
}
