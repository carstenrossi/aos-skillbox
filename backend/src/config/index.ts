// Central backend configuration loader
const environment = process.env.NODE_ENV || 'development';

let config;

if (environment === 'production') {
  config = require('./env.production').config;
} else {
  config = require('./env.development').config;
}

export default {
  ...config,
  // Override with environment variables if they exist
  PORT: process.env.PORT ? parseInt(process.env.PORT) : config.PORT,
  HOST: process.env.HOST || config.HOST,
  CORS_ORIGIN: process.env.CORS_ORIGIN || config.CORS_ORIGIN,
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true' || config.CORS_CREDENTIALS,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  DATABASE_PATH: process.env.DATABASE_PATH || config.DATABASE_PATH,
  LOG_LEVEL: process.env.LOG_LEVEL || config.LOG_LEVEL
}; 