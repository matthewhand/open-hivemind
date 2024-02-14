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

// Define a custom format that includes timestamps and combines multiple formats
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports: [
    // Console transport for all logs with timestamp
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Optional, to add color to the console output
        customFormat
      )
    }),
    // File transport for 'warn' and 'error' logs, including timestamp
    new winston.transports.File({
      level: 'warn', // Only logs at 'warn' level and more severe will be logged
      filename: './logs/bot.log',
      format: customFormat // Use the custom format for file logging as well
    })
  ],
});

module.exports = logger;
