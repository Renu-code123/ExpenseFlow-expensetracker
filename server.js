// ================== CORE IMPORTS ==================
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const socketAuth = require('./middleware/socketAuth');
const CronJobs = require('./services/cronJobs');
const aiService = require('./services/aiService');
const currencyService = require('./services/currencyService');
const internationalizationService = require('./services/internationalizationService');
const taxService = require('./services/taxService');
const collaborationService = require('./services/collaborationService');
const auditComplianceService = require('./services/auditComplianceService');
const advancedAnalyticsService = require('./services/advancedAnalyticsService');
const fraudDetectionService = require('./services/fraudDetectionService');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput, mongoSanitizeMiddleware } = require('./middleware/sanitization');
const securityMonitor = require('./services/securityMonitor');
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

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'"
        ],
        connectSrc: [
          "'self'",
          "http://localhost:3000",
          "https://api.github.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:"
        ]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);




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
// Static files
app.use(express.static('public'));

// Security logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    // Log failed requests
    if (res.statusCode >= 400) {
      securityMonitor.logSecurityEvent(req, 'suspicious_activity', {
        statusCode: res.statusCode,
        response: typeof data === 'string' ? data.substring(0, 200) : 'Non-string response'
      });
    }
    originalSend.call(this, data);
  };
  next();
});

// Make io available to the  routes
app.set('io', io);
global.io = io;

io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`User ${socket.user?.name || socket.userId} connected`);
}),
// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    // Initialize cron jobs after DB connection
    CronJobs.init();
    console.log('Email cron jobs initialized');
    
    // Initialize AI service
    aiService.init();
    console.log('AI service initialized');
    
    // Initialize currency service
    currencyService.init();
    console.log('Currency service initialized');
    
    // Initialize internationalization service
    internationalizationService.init();
    console.log('Internationalization service initialized');
    
    // Initialize tax service
    taxService.init();
    console.log('Tax service initialized');
    
    // Initialize audit compliance service
    auditComplianceService.init();
    console.log('Audit compliance service initialized');
    
    // Initialize advanced analytics service
    advancedAnalyticsService.init();
    console.log('Advanced analytics service initialized');
    
    // Initialize fraud detection service
    fraudDetectionService.init();
    console.log('Fraud detection service initialized');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO authentication
io.use(socketAuth);

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log(`User ${socket.user.name} connected`);


  socket.join(`user_${socket.userId}`);
  
  // Join workspace rooms
  const workspaces = await collaborationService.getUserWorkspaces(socket.userId);
  workspaces.forEach(workspace => {
    socket.join(`workspace_${workspace._id}`);
  });

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
app.use('/api/groups', require('./routes/groups'));
app.use('/api/splits', require('./routes/splits'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/approvals', require('./routes/approvals'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/multicurrency', require('./routes/multicurrency'));
app.use('/api/collaboration', require('./routes/collaboration'));
app.use('/api/audit-compliance', require('./routes/auditCompliance'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/fraud-detection', require('./routes/fraudDetection'));

// Root route to serve the UI
app.get('/', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'public', 'index.html'));
});

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
