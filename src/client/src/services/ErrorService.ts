export class ErrorService {
  static report(error: any, context?: Record<string, any>) {
    console.error('[ErrorService Reported]', error, context);
    // Future integration point for Sentry or other error tracking
  }
}
