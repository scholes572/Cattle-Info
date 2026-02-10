import Database from 'better-sqlite3';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dataDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(config.databasePath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Initialize schema
  initializeSchema();
  
  return db;
}

function initializeSchema(): void {
  if (!db) throw new Error('Database not initialized');

  // Create tables
  db.exec(`
    -- Cattle table
    CREATE TABLE IF NOT EXISTS cattle (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      breed TEXT NOT NULL,
      dateOfBirth TEXT NOT NULL,
      sex TEXT NOT NULL CHECK (sex IN ('male', 'female')),
      imageUrl TEXT,
      servedDate TEXT,
      matingBreed TEXT,
      expectedCalfBirthDate TEXT,
      calfBirthDate TEXT,
      calfSex TEXT CHECK (calfSex IN ('male', 'female')),
      driedDate TEXT,
      createdBy TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      lastEditedBy TEXT,
      lastEditedAt TEXT,
      lastEditedField TEXT
    );

    -- Milk records table
    CREATE TABLE IF NOT EXISTS milk_records (
      id TEXT PRIMARY KEY,
      cowName TEXT NOT NULL,
      date TEXT NOT NULL,
      morningAmount REAL NOT NULL DEFAULT 0,
      eveningAmount REAL NOT NULL DEFAULT 0,
      totalDaily REAL NOT NULL,
      addedBy TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Activities table
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      user TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('add', 'edit', 'delete')),
      category TEXT NOT NULL CHECK (category IN ('cattle', 'milk')),
      target TEXT NOT NULL,
      details TEXT
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_cattle_name ON cattle(name);
    CREATE INDEX IF NOT EXISTS idx_cattle_sex ON cattle(sex);
    CREATE INDEX IF NOT EXISTS idx_milk_cowname ON milk_records(cowName);
    CREATE INDEX IF NOT EXISTS idx_milk_date ON milk_records(date);
    CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
    CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Database health check
export function checkDatabaseHealth(): boolean {
  try {
    if (!db) return false;
    db.exec('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
