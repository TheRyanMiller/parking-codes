// Database adapter - switches between SQLite (dev) and PostgreSQL (prod/test)
const isDevelopment = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL;

// Helper to convert SQLite-style ? placeholders and quotes to PostgreSQL format
const convertSqlParams = (sql, params) => {
  if (isDevelopment) return { sql, params };
  
  let paramIndex = 1;
  let convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  // Convert double quotes around string literals to single quotes for PostgreSQL
  convertedSql = convertedSql.replace(/"([^"]+)"/g, "'$1'");
  return { sql: convertedSql, params };
};

if (isDevelopment) {
  // Use SQLite for local development
  const sqlite = require('./database');
  module.exports = {
    db: sqlite.db,
    initDatabase: sqlite.initDatabase,
    serialize: (callback) => sqlite.db.serialize(callback),
    // Wrap SQLite methods to match our interface
    get: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      if (callback) {
        sqlite.db.get(sql, params, callback);
      } else {
        return new Promise((resolve, reject) => {
          sqlite.db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      }
    },
    all: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      if (callback) {
        sqlite.db.all(sql, params, callback);
      } else {
        return new Promise((resolve, reject) => {
          sqlite.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      }
    },
    run: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      if (callback) {
        sqlite.db.run(sql, params, callback);
      } else {
        return new Promise((resolve, reject) => {
          sqlite.db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      }
    }
  };
} else {
  // Use PostgreSQL for production/test
  const pg = require('./database-pg');
  module.exports = {
    ...pg,
    serialize: (callback) => callback(), // PostgreSQL doesn't need serialize
    // Override to handle SQLite-style callbacks and convert parameters
    get: async (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      try {
        const { sql: convertedSql, params: convertedParams } = convertSqlParams(sql, params);
        const result = await pg.get(convertedSql, convertedParams);
        if (callback) callback(null, result);
        return result;
      } catch (err) {
        if (callback) callback(err);
        else throw err;
      }
    },
    all: async (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      try {
        const { sql: convertedSql, params: convertedParams } = convertSqlParams(sql, params);
        const result = await pg.all(convertedSql, convertedParams);
        if (callback) callback(null, result);
        return result;
      } catch (err) {
        if (callback) callback(err);
        else throw err;
      }
    },
    run: async (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      try {
        const { sql: convertedSql, params: convertedParams } = convertSqlParams(sql, params);
        const result = await pg.run(convertedSql, convertedParams);
        if (callback) callback(null);
        return result;
      } catch (err) {
        if (callback) callback(err);
        else throw err;
      }
    }
  };
}