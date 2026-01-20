const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const socketAuth = require('./middleware/socketAuth');
const CronJobs = require('./services/cronJobs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const syncRoutes = require('./routes/sync');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Make io available to routes
app.set('io', io);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Initialize cron jobs after DB connection
    CronJobs.init();
    console.log('Email cron jobs initialized');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO authentication
io.use(socketAuth);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} connected`);

  // Join user-specific room
  socket.join(`user_${socket.userId}`);

  // Handle sync requests
  socket.on('sync_request', async (data) => {
    try {
      // Process sync queue for this user
      const SyncQueue = require('./models/SyncQueue');
      const pendingSync = await SyncQueue.find({
        user: socket.userId,
        processed: false
      }).sort({ createdAt: 1 });

      socket.emit('sync_data', pendingSync);
    } catch (error) {
      socket.emit('sync_error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.user.name} disconnected`);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/currency', require('./routes/currency'));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});