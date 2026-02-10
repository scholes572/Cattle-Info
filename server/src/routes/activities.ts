import { Router, Response } from 'express';
import { getDatabase } from '../database';
import { AuthenticatedRequest } from '../middleware/auth';
import { ActivityEntry, CreateActivityInput } from '../types';

const router = Router();

// Get all activities
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const activities = db.prepare('SELECT * FROM activities ORDER BY timestamp DESC').all() as ActivityEntry[];
    
    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
    });
  }
});

// Add new activity
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const input: CreateActivityInput = req.body;
    
    // Validate required fields
    if (!input.user || !input.action || !input.category || !input.target) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: user, action, category, target',
      });
      return;
    }
    
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const timestamp = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO activities (id, timestamp, user, action, category, target, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      timestamp,
      input.user,
      input.action,
      input.category,
      input.target,
      input.details || null
    );
    
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as ActivityEntry;
    
    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add activity log',
    });
  }
});

export default router;
