const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database-adapter');
const authRoutes = require('./routes/auth');
const residentRoutes = require('./routes/resident');
const adminRoutes = require('./routes/admin');
const { seedInitialData } = require('./seed');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : false)
    : 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authLimiter, authRoutes);
app.use('/resident', residentRoutes);
app.use('/admin', adminRoutes);

// Serve a simple landing page in production (API-only deployment)
if (process.env.NODE_ENV === 'production') {
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Parking Codes API Server',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        auth: '/auth/*',
        resident: '/resident/*',
        admin: '/admin/*'
      }
    });
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    
    await seedInitialData();
    console.log('Initial data seeded successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();