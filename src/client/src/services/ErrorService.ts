import Debug from 'debug';
const debug = Debug('app:client:services:ErrorService');
/**
 * A centralized service for reporting errors, which can be extended to integrate
 * with third-party tracking services like Sentry, DataDog, etc.
 */
export class ErrorService {
  /**
   * Reports an error with optional context.
   *
   * @param error The error object or message to report.
   * @param context Additional metadata about where and why the error occurred.
   *
   * @example
   * try {
   *   throw new Error("Failed to load");
   * } catch (err) {
   *   ErrorService.report(err, { component: 'UserList', action: 'fetchUsers' });
   * }
   */
  static report(error: any, context?: Record<string, any>) {
    debug('ERROR:', '[ErrorService Reported]', error, context);
    // Future integration point for Sentry or other error tracking
  }
}
