const express = require('express');
const db = require('../database-adapter');
const { verifyToken, verifyResident, logAccess } = require('../middleware/auth');
const { logAuditEvent } = require('../utils/audit');

const router = express.Router();

router.use(verifyToken);
router.use(verifyResident);

router.get('/me', (req, res) => {
  db.get(
    'SELECT id, name, email, unit, created_at FROM residents WHERE id = ?',
    [req.user.id],
    (err, resident) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!resident) {
        return res.status(404).json({ error: 'Resident not found' });
      }
      res.json(resident);
    }
  );
});

router.get('/codes', logAccess('CODES_VIEW'), (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  // Auto-expire codes from previous months whenever codes are accessed
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
    `SELECT id, code, status, assigned_at, used_at 
     FROM parking_codes 
     WHERE resident_id = ? AND month_key = ? 
     ORDER BY assigned_at ASC`,
    [req.user.id, month],
    async (err, codes) => {
      if (err) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      try {
        db.run(
          'UPDATE access_logs SET codes_count = ? WHERE resident_id = ? AND month_key = ? AND action = ? AND id = (SELECT MAX(id) FROM access_logs WHERE resident_id = ? AND month_key = ? AND action = ?)',
          [codes.length, req.user.id, month, 'CODES_VIEW', req.user.id, month, 'CODES_VIEW']
        );
      } catch (updateErr) {
        console.error('Error updating access log:', updateErr);
      }

      res.json(codes);
    }
  );
});

// Request codes for current month
router.post('/request-codes', async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Check if resident already has codes for this month
    const existingCodes = await db.all(
      'SELECT id FROM parking_codes WHERE resident_id = ? AND month_key = ?',
      [req.user.id, currentMonth]
    );

    if (existingCodes.length > 0) {
      return res.status(400).json({ error: 'You already have codes allocated for this month' });
    }

    // Find up to 4 unallocated codes for this month
    const availableCodes = await db.all(
      'SELECT id, code FROM parking_codes WHERE month_key = ? AND status = "unassigned" ORDER BY id LIMIT 4',
      [currentMonth]
    );

    if (availableCodes.length === 0) {
      return res.status(400).json({ error: 'No codes available for allocation this month' });
    }

    // Allocate the codes to this resident
    const allocatedCodes = [];
    for (const codeData of availableCodes) {
      await db.run(
        'UPDATE parking_codes SET status = "assigned", resident_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ?',
        [req.user.id, codeData.id]
      );
      allocatedCodes.push({ id: codeData.id, code: codeData.code });
    }

    // Log the allocation
    try {
      await logAuditEvent({
        actorType: 'resident',
        actorId: req.user.id,
        action: 'REQUEST_CODES',
        entityType: 'parking_codes',
        entityId: req.user.id,
        newValues: { 
          month_key: currentMonth, 
          resident_id: req.user.id, 
          allocated_codes: allocatedCodes
        },
        reason: 'Resident requested codes allocation',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    res.json({ 
      message: `Successfully allocated ${allocatedCodes.length} codes for ${currentMonth}`,
      codes: allocatedCodes
    });

  } catch (error) {
    console.error('Error requesting codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/codes/:id/use', async (req, res) => {
  try {
    const codeId = req.params.id;

    db.get(
      'SELECT * FROM parking_codes WHERE id = ? AND resident_id = ?',
      [codeId, req.user.id],
      async (err, code) => {
        if (err) {
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!code) {
          return res.status(404).json({ error: 'Code not found' });
        }

        if (code.status !== 'assigned') {
          return res.status(400).json({ error: 'Code cannot be marked as used' });
        }

        const oldValues = { status: code.status, used_at: code.used_at };
        const newValues = { status: 'used', used_at: new Date().toISOString() };

        db.run(
          'UPDATE parking_codes SET status = ?, used_at = ? WHERE id = ?',
          ['used', newValues.used_at, codeId],
          async function(updateErr) {
            if (updateErr) {
              return res.status(500).json({ error: 'Failed to update code' });
            }

            try {
              await logAuditEvent({
                actorType: 'resident',
                actorId: req.user.id,
                action: 'CODE_USED',
                entityType: 'parking_code',
                entityId: codeId,
                oldValues,
                newValues,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
              });
            } catch (auditErr) {
              console.error('Audit log error:', auditErr);
            }

            res.json({ message: 'Code marked as used successfully' });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error marking code as used:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;