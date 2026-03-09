const logger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

logger.debug = Object.assign(jest.fn(), logger);

export default logger;
