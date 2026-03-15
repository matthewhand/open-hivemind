import { apiService } from './api';
import Logger from '../utils/logger';


export default apiService;
export { apiService };

export const ErrorService = {
  report(err: unknown, context?: Record<string, unknown>) {
    Logger.error('[ErrorService]', context, err);
  },
};
