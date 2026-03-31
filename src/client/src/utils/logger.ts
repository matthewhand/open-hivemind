/**
 * A simple logger utility for the client-side application.
 * It wraps the console methods and provides environment-based filtering.
 * In production, debug and info logs are suppressed to keep the console clean.
 */

const IS_DEV = import.meta.env.DEV;

const formatMessage = (level: string, args: unknown[]) => {
  const timestamp = new Date().toISOString();

  // Try to extract a component name if the first argument matches the [Component] pattern
  let component = '';
  const firstArg = args[0];
  if (typeof firstArg === 'string') {
    const match = firstArg.match(/^\[(.*?)\]/);
    if (match) {
      component = ` [${match[1]}]`;
      // We don't remove the prefix from the first arg to keep it simple,
      // but we add it to the structured prefix. Actually, let's just
      // use the prefix if it's there.
    }
  }

  // If the first argument already has the [Component] pattern, we can just prepend the timestamp and level.
  // Alternatively, we construct a standard prefix.
  const prefix = `[${timestamp}] [${level}]`;

  if (typeof firstArg === 'string' && firstArg.startsWith('[')) {
    // It likely already has a component prefix, so just prepend our metadata
    return [`${prefix} ${firstArg}`, ...args.slice(1)];
  }

  return [prefix, ...args];
};

export const logger = {
  /**
   * Log a debug message. Only shown in development.
   */
  debug: (...args: unknown[]) => {
    if (IS_DEV) {
      console.debug(...formatMessage('DEBUG', args));
    }
  },

  /**
   * Log an info message. Only shown in development.
   */
  info: (...args: unknown[]) => {
    if (IS_DEV) {
      console.info(...formatMessage('INFO', args));
    }
  },

  /**
   * Log a warning message. Always shown.
   */
  warn: (...args: unknown[]) => {
    console.warn(...formatMessage('WARN', args));
  },

  /**
   * Log an error message. Always shown.
   */
  error: (...args: unknown[]) => {
    console.error(...formatMessage('ERROR', args));
  },

  /**
   * Log a general message. Only shown in development.
   * Use this as a replacement for console.log.
   */
  log: (...args: unknown[]) => {
    if (IS_DEV) {
      console.log(...formatMessage('LOG', args));
    }
  },
};

export default logger;
