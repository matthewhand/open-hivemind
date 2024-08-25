import Debug from "debug";
const debug = Debug("app");

import pino from 'pino';

const debug = pino({
    level: process.env.DEBUG === 'true' ? 'debug' : 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
        },
    },
});

// Add missing log levels
if (!debug.warn) {
    debug.warn = debug.info.bind(debug);
}

export default debug;
