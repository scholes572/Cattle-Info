import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { initDatabase, checkDatabaseHealth } from './database';
import { apiKeyAuth } from './middleware/auth';

// Routes
import cattleRoutes from './routes/cattle';
import milkRoutes from './routes/milk';
import activitiesRoutes from './routes/activities';
import imagesRoutes from './routes/images';

const app: Express = express();

// Trust proxy for proper URL detection behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
}));

// Parse JSON bodies (except for multipart/form-data)
app.use((req, res, next) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response) => {
  const dbHealthy = checkDatabaseHealth();
  
  const status = {
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  };
  
  if (dbHealthy) {
    res.json(status);
  } else {
    res.status(503).json(status);
  }
});

// API info endpoint
app.get('/api/v1', (req: Request, res: Response) => {
  res.json({
    name: 'Cattle Keeper API',
    version: '1.0.0',
    description: 'Self-hosted API for Cattle Information Keeper',
    endpoints: {
      cattle: '/api/v1/cattle',
      milk: '/api/v1/milk',
      activities: '/api/v1/activities',
      images: '/api/v1/images',
      health: '/health',
    },
  });
});

// Apply API key authentication to all /api routes
app.use('/api/v1', apiKeyAuth);

// Static files for uploaded images
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// Mount routes
app.use('/api/v1/cattle', cattleRoutes);
app.use('/api/v1/milk', milkRoutes);
app.use('/api/v1/activities', activitiesRoutes);
app.use('/api/v1/images', imagesRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }
  
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
  });
});

// Start server
function startServer(): void {
  try {
    // Initialize database
    initDatabase();
    console.log('✓ Database initialized');
    
    // Start listening
    app.listen(config.port, () => {
      console.log(`✓ Server running on port ${config.port}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ API Base URL: http://localhost:${config.port}/api/v1`);
      console.log(`✓ Upload directory: ${config.uploadDir}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
