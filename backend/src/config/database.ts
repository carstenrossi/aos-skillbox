import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

// Database configuration
const config: PoolConfig = {
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432'),
  database: process.env['DB_NAME'] || 'skillbox_dev',
  user: process.env['DB_USER'] || 'skillbox_user',
  password: process.env['DB_PASSWORD'] || '',
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
  statement_timeout: 30000, // 30 seconds
  query_timeout: 30000, // 30 seconds
};

// Create connection pool
export const pool = new Pool(config);

// Connect to database
export const connectDatabase = async (): Promise<void> => {
  try {
    // Test the connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    logger.info(`Database connected successfully at ${config.host}:${config.port}/${config.database}`);
    logger.info(`Database time: ${result.rows[0]?.now}`);
  } catch (error) {
    logger.error('Error connecting to database:', error);
    throw error;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed.');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

// Handle pool events
pool.on('connect', (client) => {
  logger.debug('New client connected to database');
});

pool.on('error', (err, client) => {
  logger.error('Database pool error:', err);
});

pool.on('remove', (client) => {
  logger.debug('Client removed from database pool');
});

// Helper function for queries
export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed in ${duration}ms: ${text}`);
    return res;
  } catch (error) {
    logger.error(`Query error: ${text}`, error);
    throw error;
  }
};

export default pool; 