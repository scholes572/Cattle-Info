import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database';
import { AuthenticatedRequest } from '../middleware/auth';
import { Cattle, CreateCattleInput, UpdateCattleInput } from '../types';

const router = Router();

// Get all cattle
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const cattle = db.prepare('SELECT * FROM cattle ORDER BY name ASC').all() as Cattle[];
    
    res.json({
      success: true,
      data: cattle,
    });
  } catch (error) {
    console.error('Error fetching cattle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cattle records',
    });
  }
});

// Get single cattle by ID
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    const cattle = db.prepare('SELECT * FROM cattle WHERE id = ?').get(id) as Cattle | undefined;
    
    if (!cattle) {
      res.status(404).json({
        success: false,
        error: 'Cattle record not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: cattle,
    });
  } catch (error) {
    console.error('Error fetching cattle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cattle record',
    });
  }
});

// Add new cattle
router.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const input: CreateCattleInput = req.body;
    
    // Validate required fields
    if (!input.name || !input.breed || !input.dateOfBirth || !input.sex) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: name, breed, dateOfBirth, sex',
      });
      return;
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO cattle (
        id, name, breed, dateOfBirth, sex, imageUrl,
        servedDate, matingBreed, expectedCalfBirthDate,
        calfBirthDate, calfSex, driedDate, createdBy, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      input.name,
      input.breed,
      input.dateOfBirth,
      input.sex,
      input.imageUrl || null,
      input.servedDate || null,
      input.matingBreed || null,
      input.expectedCalfBirthDate || null,
      input.calfBirthDate || null,
      input.calfSex || null,
      input.driedDate || null,
      input.createdBy || null,
      now
    );
    
    const cattle = db.prepare('SELECT * FROM cattle WHERE id = ?').get(id) as Cattle;
    
    res.status(201).json({
      success: true,
      data: cattle,
    });
  } catch (error) {
    console.error('Error adding cattle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add cattle record',
    });
  }
});

// Update cattle
router.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const input: UpdateCattleInput = req.body;
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM cattle WHERE id = ?').get(id) as Cattle | undefined;
    
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Cattle record not found',
      });
      return;
    }
    
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    
    const allowedFields: (keyof UpdateCattleInput)[] = [
      'name', 'breed', 'dateOfBirth', 'sex', 'imageUrl',
      'servedDate', 'matingBreed', 'expectedCalfBirthDate',
      'calfBirthDate', 'calfSex', 'driedDate',
      'lastEditedBy', 'lastEditedAt', 'lastEditedField'
    ];
    
    for (const field of allowedFields) {
      if (input[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(input[field]);
      }
    }
    
    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No fields to update',
      });
      return;
    }
    
    updates.push('lastEditedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const query = `UPDATE cattle SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);
    
    const cattle = db.prepare('SELECT * FROM cattle WHERE id = ?').get(id) as Cattle;
    
    res.json({
      success: true,
      data: cattle,
    });
  } catch (error) {
    console.error('Error updating cattle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cattle record',
    });
  }
});

// Delete cattle
router.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    
    // Check if record exists
    const existing = db.prepare('SELECT * FROM cattle WHERE id = ?').get(id) as Cattle | undefined;
    
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Cattle record not found',
      });
      return;
    }
    
    // Delete the record
    db.prepare('DELETE FROM cattle WHERE id = ?').run(id);
    
    res.json({
      success: true,
      message: 'Cattle record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting cattle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete cattle record',
    });
  }
});

export default router;
