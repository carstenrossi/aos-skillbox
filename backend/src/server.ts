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

// Import our new configuration
import config from './config';

// Import routes
import authRoutes from './routes/auth';
import assistantRoutes from './routes/assistants';
import conversationRoutes from './routes/conversations';
import adminRoutes from './routes/admin';
import { toolsRouter } from './routes/tools';
import pluginRoutes from './routes/plugins';
import { pluginExecutionRouter } from './routes/pluginExecution';
import fileRoutes from './routes/files';

// Load environment variables
dotenv.config();

const app = express();
const PORT = config.PORT;
const HOST = config.HOST;

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

// CORS configuration using our config
app.use(cors({
  origin: config.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  credentials: config.CORS_CREDENTIALS,
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
    environment: config.NODE_ENV,
    database: 'SQLite connected',
    config: {
      host: config.HOST,
      port: config.PORT,
      cors_origin: config.CORS_ORIGIN,
      database_path: config.DATABASE_PATH
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/assistants', assistantRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tools', toolsRouter);
app.use('/api/plugins', pluginRoutes);
app.use('/api/plugin-execution', pluginExecutionRouter);
app.use('/api/files', fileRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Database imports
import { connectDatabase, closeDatabase } from './database/database';
import { runMigrations } from './database/migrations';
import { getUserModel } from './models/UserSQLite';
import { getAssistantModel } from './models/AssistantSQLite';
import { getBackupService } from './services/backupService';
import { getPluginMigrationService } from './services/pluginMigrationService';
import { settingsService } from './services/settingsService';
import { s3Service } from './services/s3Service';
import { fileService } from './services/fileService';
import { textExtractionProcessor } from './services/textExtractionProcessor';

// Database initialization and migration
const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info('🔧 Initializing SQLite database...');
    
    // Connect to database
    const database = await connectDatabase();
    
    // Run migrations
    await runMigrations();
    
    // Initialize User Model with database connection
    const userModel = getUserModel(database.instance!);
    
    // Initialize default users after migrations are complete
    await userModel.initialize();
    
    // Create default assistants if database is empty
    const assistantModel = getAssistantModel();
    await assistantModel.createDefaultAssistants();
    
    // Migrate plugins from backend/plugins/ directory
    const pluginMigrationService = getPluginMigrationService();
    await pluginMigrationService.runMigration();
    
    // Initialize backup service
    const backupService = getBackupService();
    await backupService.initialize();
    
    // Initialize Settings Service with database connection
    settingsService.setDatabase(database.instance!);
    
    // Initialize File Service
    logger.info('📁 Initializing File Service...');
    fileService.initialize();
    logger.info('✅ File Service initialized');
    
    // Try to load S3 configuration from database
    logger.info('💡 S3 Service: Will try to load from database after initialization');
    setTimeout(async () => {
      try {
        logger.info('🔄 S3 Service: Loading configuration from database...');
        const loaded = await s3Service.loadFromDatabase();
        
        if (loaded) {
          logger.info('✅ S3 Service: Configuration loaded from database successfully');
        } else {
          logger.info('💡 S3 Service: No complete configuration found in database');
        }
        
        // Process any pending text extraction files after S3 is ready
        logger.info('🔄 Starting text extraction background processor...');
        setTimeout(async () => {
          try {
            await textExtractionProcessor.processPendingFiles();
            logger.info('🔍 Checking for pending text extraction files...');
          } catch (error) {
            logger.error('🚨 Failed to process pending text extraction files:', error);
          }
        }, 2000); // Wait 2 more seconds for S3 to be fully ready
        
      } catch (error) {
        logger.error('🚨 Failed to load S3 configuration from database:', error);
      }
    }, 1000); // Wait 1 second to ensure everything is initialized
    
    logger.info('✅ Database initialization completed');
  } catch (error) {
    logger.error('🚨 Error connecting to database:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  // Stop backup service
  const backupService = getBackupService();
  backupService.stop();
  
  // Stop text extraction processor
  textExtractionProcessor.stopProcessing();
  
  if (server) {
    server.close(() => {
      logger.info('🔄 HTTP server closed');
    });
  }
  
  // Close database connection
  await closeDatabase();
  logger.info('✅ Database connection closed');
  
  process.exit(0);
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