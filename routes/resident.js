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