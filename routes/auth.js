const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database-adapter');
const { logAuditEvent } = require('../utils/audit');

const router = express.Router();

router.post('/resident/login', async (req, res) => {
  try {
    const { email, unit } = req.body;

    if (!email || !unit) {
      return res.status(400).json({ error: 'Email and unit number are required' });
    }

    db.get(
      'SELECT * FROM residents WHERE email = ? AND unit = ?',
      [email.toLowerCase().trim(), unit.toUpperCase().trim()],
      async (err, resident) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!resident) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: resident.id, email: resident.email, role: 'resident' },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        try {
          await logAuditEvent({
            actorType: 'resident',
            actorId: resident.id,
            action: 'LOGIN',
            entityType: 'resident',
            entityId: resident.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (auditErr) {
          console.error('Audit log error:', auditErr);
        }

        // Update last login time
        db.run(
          'UPDATE residents SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
          [resident.id],
          (updateErr) => {
            if (updateErr) {
              console.error('Error updating last login time:', updateErr);
            }
          }
        );

        // Check if resident needs codes assigned for current month
        const currentMonth = new Date().toISOString().slice(0, 7);
        db.get(
          'SELECT COUNT(*) as assigned_count FROM parking_codes WHERE resident_id = ? AND month_key = ?',
          [resident.id, currentMonth],
          (countErr, countResult) => {
            if (countErr) {
              console.error('Error checking assigned codes:', countErr);
              // Continue with login even if code assignment fails
              return res.json({
                token,
                user: {
                  id: resident.id,
                  name: resident.name,
                  email: resident.email,
                  unit: resident.unit,
                  role: 'resident'
                }
              });
            }

            // If resident has no codes assigned for current month, assign up to 4
            if (countResult.assigned_count === 0) {
              db.all(
                'SELECT id, code FROM parking_codes WHERE month_key = ? AND status = "unassigned" ORDER BY id LIMIT 4',
                [currentMonth],
                (codesErr, availableCodes) => {
                  if (codesErr || availableCodes.length === 0) {
                    console.error('Error finding available codes:', codesErr);
                    // Continue with login even if no codes available
                    return res.json({
                      token,
                      user: {
                        id: resident.id,
                        name: resident.name,
                        email: resident.email,
                        unit: resident.unit,
                        role: 'resident'
                      }
                    });
                  }

                  // Assign the codes
                  db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    
                    const updatePromises = availableCodes.map(codeData => {
                      return new Promise((resolve) => {
                        db.run(
                          'UPDATE parking_codes SET status = "assigned", resident_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?',
                          [resident.id, codeData.id],
                          resolve
                        );
                      });
                    });

                    Promise.all(updatePromises).then(async () => {
                      db.run('COMMIT', async (commitErr) => {
                        if (!commitErr) {
                          try {
                            await logAuditEvent({
                              actorType: 'system',
                              actorId: 0,
                              action: 'ASSIGN_CODES',
                              entityType: 'parking_codes',
                              entityId: resident.id,
                              newValues: { 
                                month_key: currentMonth, 
                                resident_id: resident.id, 
                                assigned_codes: availableCodes.map(c => ({ id: c.id, code: c.code }))
                              },
                              reason: 'Auto-assigned on first login',
                              ipAddress: req.ip,
                              userAgent: req.get('User-Agent')
                            });
                          } catch (auditErr) {
                            console.error('Audit log error:', auditErr);
                          }
                        }

                        res.json({
                          token,
                          user: {
                            id: resident.id,
                            name: resident.name,
                            email: resident.email,
                            unit: resident.unit,
                            role: 'resident'
                          }
                        });
                      });
                    });
                  });
                }
              );
            } else {
              // Resident already has codes, just return login response
              res.json({
                token,
                user: {
                  id: resident.id,
                  name: resident.name,
                  email: resident.email,
                  unit: resident.unit,
                  role: 'resident'
                }
              });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    db.get(
      'SELECT * FROM admins WHERE email = ?',
      [email.toLowerCase().trim()],
      async (err, admin) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!admin) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, admin.password_hash);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
          { id: admin.id, email: admin.email, role: 'admin' },
          process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );

        try {
          await logAuditEvent({
            actorType: 'admin',
            actorId: admin.id,
            action: 'LOGIN',
            entityType: 'admin',
            entityId: admin.id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (auditErr) {
          console.error('Audit log error:', auditErr);
        }

        res.json({
          token,
          user: {
            id: admin.id,
            email: admin.email,
            role: 'admin'
          }
        });
      }
    );
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;