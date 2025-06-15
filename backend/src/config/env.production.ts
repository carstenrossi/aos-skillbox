// Backend Production Environment Configuration
export const config = {
  NODE_ENV: 'production',
  PORT: 3001,
  HOST: '0.0.0.0',
  CORS_ORIGIN: 'https://skillboxdocker2-u31060.vm.elestio.app,http://localhost:3000,http://localhost:3003',
  CORS_CREDENTIALS: true,
  DATABASE_PATH: '/app/data/skillbox.db',
  LOG_LEVEL: 'info',
  
  // AWS S3 Configuration
  AWS_REGION: 'eu-north-1',
  AWS_S3_BUCKET: 'skillbox-master',
  AWS_ACCESS_KEY_ID: '', // To be configured in Admin Panel
  AWS_SECRET_ACCESS_KEY: '', // To be configured in Admin Panel
  S3_PUBLIC_URL_PREFIX: `https://skillbox-master.s3.eu-north-1.amazonaws.com`,
}; 
