const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create residents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS residents (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        unit TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      )
    `);

    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create parking_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS parking_codes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL,
        month_key TEXT NOT NULL,
        status TEXT DEFAULT 'unassigned' CHECK(status IN ('unassigned', 'assigned', 'used', 'expired')),
        resident_id INTEGER REFERENCES residents(id),
        assigned_at TIMESTAMP,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(code, month_key)
      )
    `);

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create access_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id SERIAL PRIMARY KEY,
        resident_id INTEGER NOT NULL REFERENCES residents(id),
        month_key TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('LOGIN', 'CODES_VIEW')),
        codes_count INTEGER DEFAULT 0,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_parking_codes_month_status ON parking_codes(month_key, status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_parking_codes_resident ON parking_codes(resident_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_access_logs_resident_month ON access_logs(resident_id, month_key)`);
    
    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Query helper that works with both SQLite and PostgreSQL patterns
const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Helper to get a single row (similar to SQLite's get method)
const get = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// Helper to get all rows (similar to SQLite's all method)
const all = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows;
};

// Helper to run a query without returning data (similar to SQLite's run method)
const run = async (text, params = []) => {
  const result = await query(text, params);
  return { 
    lastID: result.rows[0]?.id || null, 
    changes: result.rowCount 
  };
};

module.exports = { 
  pool, 
  initDatabase, 
  query, 
  get, 
  all, 
  run 
};