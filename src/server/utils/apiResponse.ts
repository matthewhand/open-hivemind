export class ApiResponse {
  static success<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      ...(message ? { message } : {}),
    };
  }

  static error(message: string, details?: any) {
    return {
      success: false,
      error: {
        message,
        ...(details ? { details } : {}),
      },
    };
  }
}
