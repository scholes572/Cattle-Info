import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { AuthenticatedRequest } from '../middleware/auth';
import { MilkRecord, CreateMilkRecordInput } from '../types';

const router = Router();

// Get all milk records
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const milkRecords = db.prepare('SELECT * FROM milk_records ORDER BY date DESC, createdAt DESC').all() as MilkRecord[];
    
    res.json({
      success: true,
      data: milkRecords,
    });
  } catch (error) {
    console.error('Error fetching milk records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch milk records',
    });
  }
});

// Add new milk record
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const input: CreateMilkRecordInput = req.body;
    
    // Validate required fields
    if (!input.cowName || !input.date) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: cowName, date',
      });
      return;
    }
    
    const id = uuidv4();
    const morningAmount = input.morningAmount || 0;
    const eveningAmount = input.eveningAmount || 0;
    const totalDaily = morningAmount + eveningAmount;
    
    const stmt = db.prepare(`
      INSERT INTO milk_records (
        id, cowName, date, morningAmount, eveningAmount, totalDaily, addedBy, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      input.cowName,
      input.date,
      morningAmount,
      eveningAmount,
      totalDaily,
      input.addedBy || null,
      new Date().toISOString()
    );
    
    const record = db.prepare('SELECT * FROM milk_records WHERE id = ?').get(id) as MilkRecord;
    
    res.status(201).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Error adding milk record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add milk record',
    });
  }
});

// Delete milk record
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM milk_records WHERE id = ?').get(id) as MilkRecord | undefined;
    
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Milk record not found',
      });
      return;
    }
    
    // Delete the record
    db.prepare('DELETE FROM milk_records WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: 'Milk record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting milk record:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete milk record',
    });
  }
});

export default router;
