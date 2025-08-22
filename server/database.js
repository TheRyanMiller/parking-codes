const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'parking_codes.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS residents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        unit TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS parking_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        month_key TEXT NOT NULL,
        status TEXT DEFAULT 'unassigned' CHECK(status IN ('unassigned', 'assigned', 'used', 'expired')),
        resident_id INTEGER,
        assigned_at DATETIME,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resident_id) REFERENCES residents(id),
        UNIQUE(code, month_key)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_type TEXT NOT NULL CHECK(actor_type IN ('admin', 'resident', 'system')),
        actor_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        reason TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id INTEGER NOT NULL,
        month_key TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('LOGIN', 'CODES_VIEW')),
        codes_count INTEGER DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (resident_id) REFERENCES residents(id)
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS idx_parking_codes_month_status ON parking_codes(month_key, status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_parking_codes_resident ON parking_codes(resident_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_access_logs_resident_month ON access_logs(resident_id, month_key)`);

      // Migration: Add last_login_at column if it doesn't exist
      db.run(`ALTER TABLE residents ADD COLUMN last_login_at DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error adding last_login_at column:', err);
        }
      });

      resolve();
    });
  });
};

module.exports = { db, initDatabase };