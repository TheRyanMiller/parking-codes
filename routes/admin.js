const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../database-adapter');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/audit');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(verifyToken);
router.use(verifyAdmin);

router.get('/residents', (req, res) => {
  const { search = '', page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  
  let sql = 'SELECT id, name, email, unit, created_at, updated_at, last_login_at FROM residents';
  let params = [];
  
  if (search) {
    sql += ' WHERE name LIKE ? OR email LIKE ? OR unit LIKE ?';
    const searchPattern = `%${search}%`;
    params = [searchPattern, searchPattern, searchPattern];
  }
  
  sql += ' ORDER BY unit, name LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  db.all(sql, params, (err, residents) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    db.get(
      'SELECT COUNT(*) as total FROM residents' + (search ? ' WHERE name LIKE ? OR email LIKE ? OR unit LIKE ?' : ''),
      search ? [searchPattern, searchPattern, searchPattern] : [],
      (countErr, countResult) => {
        if (countErr) {
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        res.json({
          residents,
          total: countResult.total,
          page: parseInt(page),
          limit: parseInt(limit)
        });
      }
    );
  });
});

router.post('/residents', async (req, res) => {
  try {
    const { name, email, unit } = req.body;
    
    if (!name || !email || !unit) {
      return res.status(400).json({ error: 'Name, email, and unit are required' });
    }
    
    const cleanEmail = email.toLowerCase().trim();
    const cleanUnit = unit.toUpperCase().trim();
    
    db.run(
      'INSERT INTO residents (name, email, unit) VALUES (?, ?, ?)',
      [name.trim(), cleanEmail, cleanUnit],
      async function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Failed to create resident' });
        }
        
        const newResident = {
          id: this.lastID,
          name: name.trim(),
          email: cleanEmail,
          unit: cleanUnit
        };
        
        try {
          await logAuditEvent({
            actorType: 'admin',
            actorId: req.user.id,
            action: 'CREATE',
            entityType: 'resident',
            entityId: this.lastID,
            newValues: newResident,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (auditErr) {
          console.error('Audit log error:', auditErr);
        }
        
        res.status(201).json(newResident);
      }
    );
  } catch (error) {
    console.error('Create resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/residents/:id', async (req, res) => {
  try {
    const residentId = req.params.id;
    const { name, email, unit } = req.body;
    
    db.get('SELECT * FROM residents WHERE id = ?', [residentId], async (err, oldResident) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!oldResident) {
        return res.status(404).json({ error: 'Resident not found' });
      }
      
      const updates = {};
      const params = [];
      const setParts = [];
      
      if (name && name !== oldResident.name) {
        updates.name = name.trim();
        setParts.push('name = ?');
        params.push(updates.name);
      }
      
      if (email && email.toLowerCase().trim() !== oldResident.email) {
        updates.email = email.toLowerCase().trim();
        setParts.push('email = ?');
        params.push(updates.email);
      }
      
      if (unit && unit.toUpperCase().trim() !== oldResident.unit) {
        updates.unit = unit.toUpperCase().trim();
        setParts.push('unit = ?');
        params.push(updates.unit);
      }
      
      if (setParts.length === 0) {
        return res.status(400).json({ error: 'No changes provided' });
      }
      
      setParts.push('updated_at = CURRENT_TIMESTAMP');
      params.push(residentId);
      
      db.run(
        `UPDATE residents SET ${setParts.join(', ')} WHERE id = ?`,
        params,
        async function(updateErr) {
          if (updateErr) {
            if (updateErr.code === 'SQLITE_CONSTRAINT_UNIQUE') {
              return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: 'Failed to update resident' });
          }
          
          try {
            await logAuditEvent({
              actorType: 'admin',
              actorId: req.user.id,
              action: 'UPDATE',
              entityType: 'resident',
              entityId: residentId,
              oldValues: oldResident,
              newValues: { ...oldResident, ...updates },
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          } catch (auditErr) {
            console.error('Audit log error:', auditErr);
          }
          
          res.json({ message: 'Resident updated successfully' });
        }
      );
    });
  } catch (error) {
    console.error('Update resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/residents/:id', async (req, res) => {
  try {
    const residentId = req.params.id;
    
    db.get('SELECT * FROM residents WHERE id = ?', [residentId], async (err, resident) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!resident) {
        return res.status(404).json({ error: 'Resident not found' });
      }
      
      db.run('DELETE FROM residents WHERE id = ?', [residentId], async function(deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ error: 'Failed to delete resident' });
        }
        
        try {
          await logAuditEvent({
            actorType: 'admin',
            actorId: req.user.id,
            action: 'DELETE',
            entityType: 'resident',
            entityId: residentId,
            oldValues: resident,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (auditErr) {
          console.error('Audit log error:', auditErr);
        }
        
        res.json({ message: 'Resident deleted successfully' });
      });
    });
  } catch (error) {
    console.error('Delete resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admins', (req, res) => {
  db.all(
    'SELECT id, email, created_at FROM admins ORDER BY email',
    (err, admins) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      res.json(admins);
    }
  );
});

router.post('/admins', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const cleanEmail = email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO admins (email, password_hash) VALUES (?, ?)',
      [cleanEmail, passwordHash],
      async function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Failed to create admin' });
        }
        
        try {
          await logAuditEvent({
            actorType: 'admin',
            actorId: req.user.id,
            action: 'CREATE',
            entityType: 'admin',
            entityId: this.lastID,
            newValues: { id: this.lastID, email: cleanEmail },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (auditErr) {
          console.error('Audit log error:', auditErr);
        }
        
        res.status(201).json({
          id: this.lastID,
          email: cleanEmail,
          message: 'Admin created successfully'
        });
      }
    );
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    const adminId = req.params.id;
    
    if (parseInt(adminId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    
    db.get('SELECT * FROM admins WHERE id = ?', [adminId], async (err, admin) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }
      
      db.run('DELETE FROM admins WHERE id = ?', [adminId], async function(deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ error: 'Failed to delete admin' });
        }
        
        try {
          await logAuditEvent({
            actorType: 'admin',
            actorId: req.user.id,
            action: 'DELETE',
            entityType: 'admin',
            entityId: adminId,
            oldValues: { id: admin.id, email: admin.email },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        } catch (auditErr) {
          console.error('Audit log error:', auditErr);
        }
        
        res.json({ message: 'Admin deleted successfully' });
      });
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/codes/upload', upload.single('file'), async (req, res) => {
  try {
    const { month_key } = req.body;
    
    if (!month_key || !/^\d{4}-\d{2}$/.test(month_key)) {
      return res.status(400).json({ error: 'Valid month_key (YYYY-MM) is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }
    
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    const codes = [];
    const errors = [];
    const duplicates = [];
    
    data.forEach((row, index) => {
      if (index === 0) return;
      
      const code = row[0]?.toString().trim().toUpperCase();
      if (!code) return;
      
      if (!/^[A-Z0-9]{6,8}$/.test(code)) {
        errors.push({ row: index + 1, code, error: 'Invalid format (must be 6-8 alphanumeric characters)' });
        return;
      }
      
      if (codes.includes(code)) {
        duplicates.push({ row: index + 1, code, error: 'Duplicate in upload' });
        return;
      }
      
      codes.push(code);
    });
    
    if (errors.length > 0 || duplicates.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        errors,
        duplicates,
        validCodes: codes.length
      });
    }
    
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      let insertedCount = 0;
      let skippedCount = 0;
      
      const insertPromises = codes.map(code => {
        return new Promise((resolve) => {
          db.run(
            'INSERT INTO parking_codes (code, month_key) VALUES (?, ?)',
            [code, month_key],
            function(err) {
              if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                skippedCount++;
              } else if (!err) {
                insertedCount++;
              }
              resolve();
            }
          );
        });
      });
      
      Promise.all(insertPromises).then(async () => {
        db.run('COMMIT', async (commitErr) => {
          if (commitErr) {
            return res.status(500).json({ error: 'Failed to save codes' });
          }
          
          try {
            await logAuditEvent({
              actorType: 'admin',
              actorId: req.user.id,
              action: 'UPLOAD_CODES',
              entityType: 'parking_codes',
              entityId: null,
              newValues: { month_key, total_codes: codes.length, inserted: insertedCount, skipped: skippedCount },
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          } catch (auditErr) {
            console.error('Audit log error:', auditErr);
          }
          
          res.json({
            message: 'Codes uploaded successfully',
            month_key,
            total: codes.length,
            inserted: insertedCount,
            skipped: skippedCount
          });
        });
      });
    });
    
  } catch (error) {
    console.error('Upload codes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/codes/assign', async (req, res) => {
  try {
    const { month_key, resident_id, count = 1 } = req.body;
    
    if (!month_key || !resident_id) {
      return res.status(400).json({ error: 'month_key and resident_id are required' });
    }
    
    if (count < 1 || count > 4) {
      return res.status(400).json({ error: 'Count must be between 1 and 4' });
    }
    
    db.get(
      'SELECT COUNT(*) as assigned_count FROM parking_codes WHERE resident_id = ? AND month_key = ?',
      [resident_id, month_key],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        const currentCount = result.assigned_count;
        const availableSlots = 4 - currentCount;
        
        if (count > availableSlots) {
          return res.status(400).json({ 
            error: `Cannot assign ${count} codes. Resident already has ${currentCount}/4 codes for this month.` 
          });
        }
        
        db.all(
          'SELECT id, code FROM parking_codes WHERE month_key = ? AND status = "unassigned" ORDER BY id LIMIT ?',
          [month_key, count],
          async (codesErr, availableCodes) => {
            if (codesErr) {
              return res.status(500).json({ error: 'Internal server error' });
            }
            
            if (availableCodes.length < count) {
              return res.status(400).json({ 
                error: `Only ${availableCodes.length} unassigned codes available for ${month_key}` 
              });
            }
            
            db.serialize(() => {
              db.run('BEGIN TRANSACTION');
              
              const updatePromises = availableCodes.map(codeData => {
                return new Promise((resolve) => {
                  db.run(
                    'UPDATE parking_codes SET status = "assigned", resident_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [resident_id, codeData.id],
                    resolve
                  );
                });
              });
              
              Promise.all(updatePromises).then(async () => {
                db.run('COMMIT', async (commitErr) => {
                  if (commitErr) {
                    return res.status(500).json({ error: 'Failed to assign codes' });
                  }
                  
                  try {
                    await logAuditEvent({
                      actorType: 'admin',
                      actorId: req.user.id,
                      action: 'ASSIGN_CODES',
                      entityType: 'parking_codes',
                      entityId: null,
                      newValues: { 
                        month_key, 
                        resident_id, 
                        assigned_codes: availableCodes.map(c => ({ id: c.id, code: c.code }))
                      },
                      ipAddress: req.ip,
                      userAgent: req.get('User-Agent')
                    });
                  } catch (auditErr) {
                    console.error('Audit log error:', auditErr);
                  }
                  
                  res.json({
                    message: `${count} codes assigned successfully`,
                    assigned_codes: availableCodes.map(c => c.code)
                  });
                });
              });
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Assign codes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/codes/:id/status', async (req, res) => {
  try {
    const codeId = req.params.id;
    const { status, reason } = req.body;
    
    if (!['unassigned', 'assigned', 'used', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required for manual status changes' });
    }
    
    db.get('SELECT * FROM parking_codes WHERE id = ?', [codeId], async (err, oldCode) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!oldCode) {
        return res.status(404).json({ error: 'Code not found' });
      }
      
      db.run(
        'UPDATE parking_codes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, codeId],
        async function(updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: 'Failed to update code status' });
          }
          
          try {
            await logAuditEvent({
              actorType: 'admin',
              actorId: req.user.id,
              action: 'CHANGE_CODE_STATUS',
              entityType: 'parking_code',
              entityId: codeId,
              oldValues: { status: oldCode.status },
              newValues: { status },
              reason,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          } catch (auditErr) {
            console.error('Audit log error:', auditErr);
          }
          
          res.json({ message: 'Code status updated successfully' });
        }
      );
    });
  } catch (error) {
    console.error('Update code status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/codes/:id/assign', async (req, res) => {
  try {
    const codeId = req.params.id;
    const { assign_to } = req.body;
    
    if (!assign_to) {
      return res.status(400).json({ error: 'assign_to is required' });
    }
    
    db.get('SELECT * FROM parking_codes WHERE id = ?', [codeId], async (err, code) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!code) {
        return res.status(404).json({ error: 'Code not found' });
      }
      
      if (code.status !== 'unassigned') {
        return res.status(400).json({ error: 'Code is not available for assignment' });
      }
      
      let residentId = null;
      let assigneeName = 'ADMIN';
      
      if (assign_to !== 'ADMIN') {
        const resident = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM residents WHERE id = ?', [assign_to], (resErr, res) => {
            if (resErr) reject(resErr);
            else resolve(res);
          });
        });
        
        if (!resident) {
          return res.status(404).json({ error: 'Resident not found' });
        }
        
        residentId = resident.id;
        assigneeName = `${resident.name} (${resident.unit})`;
      }
      
      db.run(
        'UPDATE parking_codes SET status = "assigned", resident_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?',
        [residentId, codeId],
        async function(updateErr) {
          if (updateErr) {
            return res.status(500).json({ error: 'Failed to assign code' });
          }
          
          try {
            await logAuditEvent({
              actorType: 'admin',
              actorId: req.user.id,
              action: 'MANUAL_ASSIGN_CODE',
              entityType: 'parking_code',
              entityId: codeId,
              oldValues: { status: code.status, resident_id: code.resident_id },
              newValues: { status: 'assigned', resident_id: residentId },
              reason: assign_to === 'ADMIN' ? 'Manual assignment to ADMIN (removed from circulation)' : `Manual assignment to resident: ${assigneeName}`,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          } catch (auditErr) {
            console.error('Audit log error:', auditErr);
          }
          
          res.json({ 
            message: `Code ${code.code} assigned to ${assigneeName}`,
            code: code.code,
            assigned_to: assigneeName
          });
        }
      );
    });
  } catch (error) {
    console.error('Assign code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Auto-expire codes from previous months whenever dashboard is accessed
  db.run(
    'UPDATE parking_codes SET status = "expired" WHERE month_key < ? AND status IN ("unassigned", "assigned")',
    [currentMonth],
    (expireErr) => {
      if (expireErr) {
        console.error('Error auto-expiring old codes:', expireErr);
      }
    }
  );
  
  db.all(
    `SELECT 
       status,
       COUNT(*) as count
     FROM parking_codes 
     WHERE month_key = ? 
     GROUP BY status`,
    [month],
    (err, statusCounts) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      const stats = {
        uploaded: 0,
        allocated: 0,
        used: 0,
        expired: 0,
        unallocated: 0
      };
      
      statusCounts.forEach(row => {
        const count = parseInt(row.count, 10);
        if (row.status === 'unassigned') {
          stats.unallocated = count;
          stats.uploaded += count;
        } else if (row.status === 'assigned') {
          stats.allocated = count;
          stats.uploaded += count;
        } else if (row.status === 'used') {
          stats.used = count;
          stats.uploaded += count;
        } else if (row.status === 'expired') {
          stats.expired = count;
          stats.uploaded += count;
        }
      });
      
      res.json({ month, stats });
    }
  );
});

router.get('/codes/by-status/:status', (req, res) => {
  const { status } = req.params;
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const { limit = 50 } = req.query;
  
  if (!['assigned', 'unassigned', 'used', 'expired'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  let sql = `SELECT 
    pc.id, 
    pc.code, 
    pc.status, 
    pc.assigned_at, 
    pc.used_at,
    r.name as resident_name,
    r.email as resident_email,
    r.unit as resident_unit
  FROM parking_codes pc
  LEFT JOIN residents r ON pc.resident_id = r.id
  WHERE pc.month_key = ? AND pc.status = ?
  ORDER BY pc.assigned_at DESC, pc.id ASC
  LIMIT ?`;
  
  db.all(sql, [month, status, limit], (err, codes) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json({ 
      status, 
      month, 
      codes,
      count: codes.length 
    });
  });
});

router.get('/audit', (req, res) => {
  const { 
    actor, 
    action, 
    entity_type, 
    entity_id, 
    from, 
    to, 
    page = 1, 
    limit = 50 
  } = req.query;
  
  const offset = (page - 1) * limit;
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];
  
  if (actor) {
    sql += ' AND actor_type = ?';
    params.push(actor);
  }
  
  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }
  
  if (entity_type) {
    sql += ' AND entity_type = ?';
    params.push(entity_type);
  }
  
  if (entity_id) {
    sql += ' AND entity_id = ?';
    params.push(entity_id);
  }
  
  if (from) {
    sql += ' AND created_at >= ?';
    params.push(from);
  }
  
  if (to) {
    sql += ' AND created_at <= ?';
    params.push(to);
  }
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  db.all(sql, params, (err, logs) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    const processedLogs = logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));
    
    res.json({
      logs: processedLogs,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  });
});

router.get('/access/summary', (req, res) => {
  const { 
    month = new Date().toISOString().slice(0, 7), 
    search = '', 
    access_state = '', 
    page = 1, 
    limit = 50 
  } = req.query;
  
  const offset = (page - 1) * limit;
  
  let sql = `
    SELECT DISTINCT
      r.id as resident_id,
      r.name,
      r.email,
      r.unit,
      COUNT(pc.id) as code_count,
      CASE WHEN al.resident_id IS NOT NULL THEN 1 ELSE 0 END as accessed,
      MAX(al.created_at) as last_access_at,
      COUNT(al.id) as view_count
    FROM residents r
    LEFT JOIN parking_codes pc ON r.id = pc.resident_id AND pc.month_key = ?
    LEFT JOIN access_logs al ON r.id = al.resident_id AND al.month_key = ? AND al.action = 'CODES_VIEW'
  `;
  
  const params = [month, month];
  
  if (search) {
    sql += ' WHERE (r.name LIKE ? OR r.email LIKE ? OR r.unit LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  sql += ' GROUP BY r.id, r.name, r.email, r.unit';
  
  if (access_state === 'accessed') {
    sql += ' HAVING accessed = 1';
  } else if (access_state === 'not_accessed') {
    sql += ' HAVING accessed = 0 AND code_count > 0';
  } else if (access_state === 'no_codes') {
    sql += ' HAVING code_count = 0';
  }
  
  sql += ' ORDER BY r.unit, r.name LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  db.all(sql, params, (err, residents) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    const processedResidents = residents.map(resident => ({
      ...resident,
      has_codes: resident.code_count > 0,
      accessed: Boolean(resident.accessed)
    }));
    
    res.json({
      residents: processedResidents,
      month,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  });
});


module.exports = router;