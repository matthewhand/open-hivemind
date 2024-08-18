import pino from 'pino';

const logger = pino({
    level: process.env.DEBUG === 'true' ? 'debug' : 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
});

// Add missing log levels
if (!logger.warn) {
    logger.warn = logger.info.bind(logger);
}

export default logger;
