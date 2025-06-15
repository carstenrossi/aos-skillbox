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
  LOG_LEVEL: process.env.LOG_LEVEL || config.LOG_LEVEL,
  // AWS S3 Configuration
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || config.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || config.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION || config.AWS_REGION || 'eu-north-1',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || config.AWS_S3_BUCKET || 'skillbox-master',
  S3_PUBLIC_URL_PREFIX: process.env.S3_PUBLIC_URL_PREFIX || config.S3_PUBLIC_URL_PREFIX || 'https://skillbox-master.s3.eu-north-1.amazonaws.com'
}; 