import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'http';

import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { logger } from './utils/logger';
// import { connectDatabase } from './config/database';
// import { connectRedis } from './config/redis';

// Import routes
import authRoutes from './routes/auth';
import assistantRoutes from './routes/assistants';
import conversationRoutes from './routes/conversations';
import adminRoutes from './routes/admin';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

let server: Server;

// Rate limiting - mehr permissiv für Entwicklung
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute instead of 15
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 1000 requests instead of 100
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan(process.env.LOG_FORMAT || 'combined'));
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for uploaded files)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'SQLite connected'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/assistants', assistantRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Database imports
import { connectDatabase, closeDatabase } from './database/database';
import { runMigrations } from './database/migrations';
import { getAssistantModel } from './models/AssistantSQLite';

// Database initialization and migration
const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info('🔧 Initializing SQLite database...');
    
    // Connect to database
    await connectDatabase();
    
    // Run migrations
    await runMigrations();
    
    // Create default assistants if database is empty
    const assistantModel = getAssistantModel();
    await assistantModel.createDefaultAssistants();
    
    logger.info('✅ Database initialization completed');
  } catch (error) {
    logger.error('🚨 Error connecting to database:', error);
    throw error;
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${new Date().toISOString().split('T')[1].slice(0, -1)} info: ${signal} received. Starting graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      logger.info('🔄 HTTP server closed');
      
      try {
        await closeDatabase();
        logger.info('✅ Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('🚨 Error during shutdown:', error);
        process.exit(1);
      }
    });
  } else {
    try {
      await closeDatabase();
      process.exit(0);
    } catch (error) {
      logger.error('🚨 Error during shutdown:', error);
      process.exit(1);
    }
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('🚨 Uncaught Exception:', error);
  gracefulShutdown('Uncaught Exception');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('Unhandled Rejection');
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    await initializeDatabase();
    
    server = app.listen(PORT, () => {
      logger.info(`${new Date().toISOString().split('T')[1].slice(0, -1)} info: 🚀 Skillbox Backend Server running on http://${HOST}:${PORT}`);
      logger.info(`${new Date().toISOString().split('T')[1].slice(0, -1)} info: Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`${new Date().toISOString().split('T')[1].slice(0, -1)} info: Health check: http://${HOST}:${PORT}/health`);
    });
    
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`🚨 Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        throw error;
      }
    });
    
  } catch (error) {
    logger.error('🚨 Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app; 