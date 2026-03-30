export interface ApiEnvelope<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export const ApiResponse = {
  success: <T = any>(data?: T): ApiEnvelope<T> => {
    return {
      success: true,
      data,
    };
  },

  error: (message: string, code?: string, statusCode?: number): ApiEnvelope => {
    const envelope: ApiEnvelope = {
      success: false,
      error: message,
    };
    if (code) {
      envelope.code = code;
    }
    return envelope;
  },
};
