import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Security
  apiKey: process.env.API_KEY || 'cattle-keeper-secret-key-change-in-production',
  
  // Database
  databasePath: process.env.DATABASE_PATH || './data/database.sqlite',
  
  // File Upload
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
