import { apiService } from './api';
import Debug from 'debug';
const debug = Debug('app:client:services:apiService');

export default apiService;
export { apiService };

export const ErrorService = {
  report(err: unknown, context?: Record<string, unknown>) {
    debug('ERROR:', '[ErrorService]', context, err);
  },
};
