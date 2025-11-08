require('dotenv').config();

// Environment validation - Critical security check
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ SECURITY ERROR: Missing required environment variable: ${envVar}`);
    console.error('⚠️  Application cannot start without proper security configuration');
    process.exit(1);
  }
});

// Validate JWT secret strength
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ SECURITY ERROR: JWT_SECRET must be at least 32 characters long');
  console.error('Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

console.log('✅ Environment security validation passed');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { authRoutes, cardRoutes, adminRoutes, configRoutes } = require('./routes');
const { apiRateLimit, errorHandler, requestLogger } = require('./middleware/validation');
const PerformanceMonitor = require('./services/performanceMonitor');

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection with optimized settings
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/processsutra', {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Security middleware - Enhanced configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://generativelanguage.googleapis.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL ? 
    [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'] : 
    ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression middleware for better performance
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses larger than 1kb
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Performance monitoring
app.use(PerformanceMonitor.trackRequest());

// Rate limiting
app.use(apiRateLimit);

// Health check endpoint
app.get('/health', (req, res) => {
  const performanceSummary = PerformanceMonitor.getSummary();
  res.json({ 
    status: performanceSummary.status, 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    performance: performanceSummary.summary
  });
});

// Performance metrics endpoint (for monitoring)
app.get('/metrics', (req, res) => {
  res.json(PerformanceMonitor.getMetrics());
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
  
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🗜️  Compression enabled for better performance`);
  console.log(`💾 Database caching enabled`);
  console.log(`🔒 Security headers configured`);
  
  // Check Redis connection
  if (!process.env.REDIS_URL) {
    console.log('🔄 Redis not configured - using direct webhook delivery');
  }
});

module.exports = app;