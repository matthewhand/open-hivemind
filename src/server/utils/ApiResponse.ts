export class ApiResponse {
  static success<T>(data?: T, message?: string) {
    return {
      success: true,
      data,
      ...(message && { message }),
    };
  }

  static error(error: string, code?: string, data?: any) {
    return {
      success: false,
      error,
      ...(code && { code }),
      ...(data && { data }),
    };
  }
}
