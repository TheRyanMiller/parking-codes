const db = require('../database-adapter');

const logAuditEvent = async (params) => {
  const {
    actorType,
    actorId,
    action,
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    reason = null,
    ipAddress = null,
    userAgent = null,
    metadata = null
  } = params;

  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO audit_logs 
      (actor_type, actor_id, action, entity_type, entity_id, old_values, new_values, reason, ip_address, user_agent, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
      actorType,
      actorId,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      reason,
      ipAddress,
      userAgent,
      metadata ? JSON.stringify(metadata) : null
    ];

    db.run(sql, values, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
};

module.exports = { logAuditEvent };