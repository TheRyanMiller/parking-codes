const bcrypt = require('bcryptjs');
const db = require('./database-adapter');

const seedInitialData = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      db.get('SELECT COUNT(*) as count FROM admins', async (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        if (result.count > 0) {
          console.log('Database already has data, skipping seed');
          resolve();
          return;
        }

        const adminPasswordHash = await bcrypt.hash('admin123', 10);

        db.serialize(() => {
          db.run('BEGIN TRANSACTION');

          db.run(
            'INSERT INTO admins (email, password_hash) VALUES (?, ?)',
            ['admin@example.com', adminPasswordHash]
          );

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

          residents.forEach(resident => {
            db.run(
              'INSERT INTO residents (name, email, unit) VALUES (?, ?, ?)',
              [resident.name, resident.email, resident.unit]
            );
          });

          const currentMonth = new Date().toISOString().slice(0, 7);
          const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

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

          const lastMonthCodes = [
            'ZZ123AA', 'YY456BB', 'XX789CC', 'WW012DD', 'VV345EE',
            'UU678FF', 'TT901GG', 'SS234HH', 'RR567II', 'QQ890JJ'
          ];

          currentMonthCodes.forEach(code => {
            db.run(
              'INSERT INTO parking_codes (code, month_key, status) VALUES (?, ?, ?)',
              [code, currentMonth, 'unassigned']
            );
          });

          lastMonthCodes.forEach(code => {
            db.run(
              'INSERT INTO parking_codes (code, month_key, status) VALUES (?, ?, ?)',
              [code, lastMonth, 'expired']
            );
          });

          // Codes will be auto-assigned when residents first log in

          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              reject(commitErr);
            } else {
              console.log('Demo data seeded successfully');
              resolve();
            }
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { seedInitialData };