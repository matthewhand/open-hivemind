const winston = require('winston');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = './logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Setup Winston logger
const debugMode = process.env.DEBUG === 'true';
const logLevel = debugMode ? 'debug' : 'info';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
        // File transport for 'warn' and 'error' logs
        new winston.transports.File({
          level: 'warn', // Only logs at 'warn' level and more severe will be logged
          filename: './logs/bot.log'
      })
    ],
});

module.exports = logger;
