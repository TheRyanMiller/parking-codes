#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const db = require('../database-adapter');

async function loadBaseData() {
  try {
    console.log('🔄 Loading base user and code data...');

    // Create admin if doesn't exist
    const adminCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM admins', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (adminCount === 0) {
      console.log('📝 Creating admin user...');
      const adminPasswordHash = await bcrypt.hash('admin123', 10);
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO admins (email, password_hash) VALUES (?, ?)',
          ['admin@example.com', adminPasswordHash],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      console.log('✅ Admin created: admin@example.com / admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create residents
    const residentCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM residents', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const residents = [
      { name: 'John Smith', email: 'john.smith@email.com', unit: 'W101' },
      { name: 'Sarah Johnson', email: 'sarah.j@email.com', unit: 'W203' },
      { name: 'Michael Brown', email: 'mbrown@email.com', unit: 'E405' },
      { name: 'Lisa Davis', email: 'lisa.davis@email.com', unit: 'W332' },
      { name: 'David Wilson', email: 'dwilson@email.com', unit: 'E509' },
      { name: 'Emma Garcia', email: 'emma.garcia@email.com', unit: 'W707' },
      { name: 'James Miller', email: 'j.miller@email.com', unit: 'E801' },
      { name: 'Anna Martinez', email: 'anna.m@email.com', unit: 'W905' }
    ];

    if (residentCount === 0) {
      console.log('📝 Creating residents...');
      for (const resident of residents) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO residents (name, email, unit) VALUES (?, ?, ?)',
            [resident.name, resident.email, resident.unit],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log(`✅ Created ${residents.length} residents`);
    } else {
      console.log(`ℹ️  ${residentCount} residents already exist`);
    }

    // Generate parking codes for current and last month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
    
    // Check if codes exist for current month
    const codeCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM parking_codes WHERE month_key = ?', [currentMonth], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (codeCount === 0) {
      console.log(`📝 Generating parking codes for ${currentMonth}...`);
      
      // Generate 40 unique codes for current month
      const currentMonthCodes = [
        'FL493JL', 'NK582MX', 'QR759ZY', 'BH183KD', 'PW947ST',
        'LM625QC', 'XT308VB', 'GH472LN', 'ZK916MD', 'VP584RY',
        'DM139FX', 'SW851JK', 'QN467LP', 'BF293WD', 'TK735HM',
        'YR684SZ', 'JM125VK', 'PQ893LX', 'WH456NT', 'DK792BF',
        'ML384JQ', 'SK617WZ', 'VN249HD', 'QR853JL', 'FP726KM',
        'BX194ST', 'TL567QN', 'NK829VD', 'ZH351LP', 'WK785JM',
        'QL492BF', 'MX637ST', 'PH164NK', 'VL829QR', 'JK574WD',
        'DN293LP', 'ST647BF', 'QK915VL', 'NH382JM', 'BL758QK'
      ];

      for (const code of currentMonthCodes) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO parking_codes (code, month_key, status) VALUES (?, ?, ?)',
            [code, currentMonth, 'unassigned'],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log(`✅ Generated ${currentMonthCodes.length} codes for ${currentMonth}`);
    } else {
      console.log(`ℹ️  ${codeCount} codes already exist for ${currentMonth}`);
    }

    // Check if codes exist for last month (expired)
    const lastMonthCodeCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM parking_codes WHERE month_key = ?', [lastMonth], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (lastMonthCodeCount === 0) {
      console.log(`📝 Generating expired codes for ${lastMonth}...`);
      
      const lastMonthCodes = [
        'ZZ123AA', 'YY456BB', 'XX789CC', 'WW012DD', 'VV345EE',
        'UU678FF', 'TT901GG', 'SS234HH', 'RR567II', 'QQ890JJ'
      ];

      for (const code of lastMonthCodes) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO parking_codes (code, month_key, status) VALUES (?, ?, ?)',
            [code, lastMonth, 'expired'],
            function(err) {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log(`✅ Generated ${lastMonthCodes.length} expired codes for ${lastMonth}`);
    } else {
      console.log(`ℹ️  ${lastMonthCodeCount} codes already exist for ${lastMonth}`);
    }

    console.log('\n🎉 Base data loading complete!');
    console.log('\n📋 Summary:');
    console.log('   Admin: admin@example.com / admin123');
    console.log('   Sample residents: john.smith@email.com (W101), sarah.j@email.com (W203), etc.');
    console.log(`   Current month codes: ${currentMonth} (unassigned)`);
    console.log(`   Last month codes: ${lastMonth} (expired)`);
    console.log('\n🚀 Users can now login and request codes!');

  } catch (error) {
    console.error('❌ Error loading base data:', error);
    process.exit(1);
  } finally {
    if (db.close) {
      db.close();
    }
    process.exit(0);
  }
}

// Run the script
loadBaseData();