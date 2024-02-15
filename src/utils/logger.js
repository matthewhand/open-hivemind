const winston = require('winston');
require('winston-daily-rotate-file'); // Import the daily rotate file module

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

// Configure the daily rotate file transport
const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: `${logsDir}/bot-%DATE%.log`, // The %DATE% placeholder is replaced with the actual date
  datePattern: 'YYYY-MM-DD', // This is the default pattern, change it according to your needs
  zippedArchive: true, // Enable compression
  maxSize: '20m', // Maximum size of the log file
  maxFiles: '14d' // Keep logs for 14 days
});

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    dailyRotateFileTransport // Use the daily rotate file transport for file logging
  ],
});

module.exports = logger;