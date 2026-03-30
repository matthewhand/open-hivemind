/**
 * Standard API response envelope.
 *
 * Success: { success: true, data: T }
 * Error:   { success: false, error: string, code?: string, details?: unknown }
 */

export interface ApiSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiEnvelope<T = unknown> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export const ApiResponse = {
  /**
   * Wrap a successful payload in the standard envelope.
   */
  success<T = unknown>(data?: T): ApiSuccessEnvelope<T> {
    return { success: true, data: data as T };
  },

  /**
   * Wrap an error in the standard envelope.
   *
   * @param message  Human-readable error description.
   * @param code     Machine-readable error code (e.g. "NOT_FOUND").
   * @param details  Optional structured details (validation issues, etc.).
   */
  error(message: string, code?: string, details?: unknown): ApiErrorEnvelope {
    const envelope: ApiErrorEnvelope = { success: false, error: message };
    if (code !== undefined) {
      envelope.code = code;
    }
    if (details !== undefined) {
      envelope.details = details;
    }
    return envelope;
  },
};
