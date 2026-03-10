import { apiService } from './api';
import Logger from '../utils/logger';


export default apiService;
export { apiService };

export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try { return await fn(); } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export const ErrorService = {
  report(err: unknown, context?: Record<string, unknown>) {
    Logger.error('[ErrorService]', context, err);
  },
};
