import { apiService } from './api';

export default apiService;
export { apiService };

export const ErrorService = {
  report(err: unknown, context?: Record<string, unknown>) {
    console.error('[ErrorService]', context, err);
  },
};
