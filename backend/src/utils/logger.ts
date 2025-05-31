import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors 
winston.addColors(colors);

// Define which level to show for which environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different formats for different environments
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  // Allow console logging
  new winston.transports.Console(),
  // Allow file logging for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // Allow file logging for all logs
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
import { mkdirSync } from 'fs';
import { dirname } from 'path';

try {
  mkdirSync(dirname('./logs/error.log'), { recursive: true });
} catch (error) {
  // Directory already exists or other error
}

export { logger }; 