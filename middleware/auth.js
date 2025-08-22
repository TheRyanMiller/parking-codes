const jwt = require('jsonwebtoken');
const db = require('../database-adapter');

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

const verifyResident = (req, res, next) => {
  if (req.user.role !== 'resident') {
    return res.status(403).json({ error: 'Access denied. Resident role required.' });
  }
  next();
};

const logAccess = (action) => {
  return (req, res, next) => {
    if (req.user && req.user.role === 'resident') {
      const { id: resident_id } = req.user;
      const month_key = req.query.month || new Date().toISOString().slice(0, 7);
      const ip_address = req.ip || req.connection.remoteAddress;
      const user_agent = req.get('User-Agent');
      
      db.run(
        'INSERT INTO access_logs (resident_id, month_key, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
        [resident_id, month_key, action, ip_address, user_agent]
      );
    }
    next();
  };
};

module.exports = { verifyToken, verifyAdmin, verifyResident, logAccess };