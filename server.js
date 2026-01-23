// ================== CORE IMPORTS ==================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

// ================== APP SETUP ==================
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ================== CUSTOM IMPORTS ==================
const socketAuth = require('./middleware/socketAuth');
const CronJobs = require('./services/cronJobs');
const {
  generalLimiter,
  authLimiter,
  expenseLimiter,
  uploadLimiter
} = require('./middleware/rateLimiter');
const {
  sanitizeInput,
  mongoSanitizeMiddleware
} = require('./middleware/sanitization');
const securityMonitor = require('./services/securityMonitor');

// Routes
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const syncRoutes = require('./routes/sync');

// ================== PORT ==================
const PORT = process.env.PORT || 3000;

// ================== SECURITY ==================
app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',   // React (future)
      'http://localhost:3001',
      'http://localhost:5500',   // Live Server ✅
      'http://127.0.0.1:5500',   // Live Server (alt) ✅
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // allow requests with no origin (Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(generalLimiter);

// ================== BODY & SANITIZATION ==================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitizeMiddleware);
app.use(sanitizeInput);
app.use(securityMonitor.blockSuspiciousIPs());

// ================== STATIC FRONTEND ==================
// 👉 YAHI SE FULL PAGE SERVE HOGA
app.use(express.static('public'));

// ================== SOCKET.IO ==================
app.set('io', io);
global.io = io;

io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`User ${socket.user?.name || socket.userId} connected`);

  socket.join(`user_${socket.userId}`);

  socket.on('sync_request', async () => {
    try {
      const SyncQueue = require('./models/SyncQueue');
      const pending = await SyncQueue.find({
        user: socket.userId,
        processed: false
      }).sort({ createdAt: 1 });

      socket.emit('sync_data', pending);
    } catch (err) {
      socket.emit('sync_error', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// ================== API ROUTES ==================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/expenses', expenseLimiter, expenseRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/receipts', uploadLimiter, require('./routes/receipts'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/currency', require('./routes/currency'));

// ================== HEALTH CHECK (OPTIONAL) ==================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ExpenseFlow Backend Healthy 🚀'
  });
});

// ================== DATABASE ==================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    CronJobs.init();
    console.log('Cron jobs initialized');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// ================== SERVER START ==================
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Security enabled: Rate limit, Sanitization, Helmet');
});
