// Backend Production Environment Configuration
export const config = {
  NODE_ENV: 'production',
  PORT: 3001,
  HOST: '0.0.0.0',
  CORS_ORIGIN: 'https://skillboxdocker2-u31060.vm.elestio.app,http://localhost:3000',
  CORS_CREDENTIALS: true,
  DATABASE_PATH: '/app/data/skillbox.db',
  LOG_LEVEL: 'info'
}; 