#!/usr/bin/env node

const db = require('../database-adapter');

async function unassignAllCodes() {
  try {
    console.log('🔄 Starting to unassign all parking codes...');
    
    // Get count of currently assigned codes
    const { sql: countSql } = db.convertSqlParams(
      'SELECT COUNT(*) as count FROM parking_codes WHERE status = ?',
      ['assigned']
    );
    
    const assignedCount = await new Promise((resolve, reject) => {
      db.get(countSql, ['assigned'], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    console.log(`📊 Found ${assignedCount} assigned codes`);
    
    if (assignedCount === 0) {
      console.log('✅ No codes to unassign. All codes are already unassigned.');
      db.close();
      return;
    }
    
    // Update all assigned codes to unassigned
    const { sql: updateSql } = db.convertSqlParams(
      'UPDATE parking_codes SET status = ?, resident_id = ? WHERE status = ?',
      ['unassigned', null, 'assigned']
    );
    
    const result = await new Promise((resolve, reject) => {
      db.run(updateSql, ['unassigned', null, 'assigned'], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
    
    console.log(`✅ Successfully unassigned ${result} parking codes`);
    console.log('   - Status changed to: unassigned');
    console.log('   - Resident ID set to: NULL');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Error unassigning codes:', error);
    db.close();
    process.exit(1);
  }
}

// Run the script
unassignAllCodes();