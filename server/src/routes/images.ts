import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = config.uploadDir;
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  },
});

// File filter for images only
const fileFilter = (
  req: AuthenticatedRequest,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (config.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${config.allowedImageTypes.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
  },
});

// Upload image
router.post('/upload', upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.status(201).json({
      success: true,
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
});

// Delete image
router.delete('/:filename', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        error: 'Invalid filename',
      });
      return;
    }

    const filePath = path.join(config.uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: 'Image not found',
      });
      return;
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image',
    });
  }
});

// Get image info
router.get('/:filename', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename } = req.params;
    
    // Prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({
        success: false,
        error: 'Invalid filename',
      });
      return;
    }

    const filePath = path.join(config.uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: 'Image not found',
      });
      return;
    }

    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      data: {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      },
    });
  } catch (error) {
    console.error('Error getting image info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get image info',
    });
  }
});

export default router;
