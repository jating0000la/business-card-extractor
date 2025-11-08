const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiting middleware
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limit
const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Auth rate limit (reasonable for normal usage)
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  30, // limit each IP to 30 auth requests per windowMs
  'Too many authentication attempts from this IP, please try again later.'
);

// Image processing rate limit
const uploadRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 uploads per minute
  'Too many upload requests, please slow down.'
);

// User invite rate limit
const inviteRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  5, // limit each IP to 5 invites per hour
  'Too many invitation requests, please try again later.'
);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Common validation rules
const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email is required');

const validateUrl = body('url')
  .isURL({ protocols: ['http', 'https'] })
  .withMessage('Valid HTTP/HTTPS URL is required');

const validateApiKey = body('apiKey')
  .isLength({ min: 10 })
  .withMessage('API key must be at least 10 characters long');

const validateWebhookSecret = body('secret')
  .isLength({ min: 16, max: 64 })
  .withMessage('Webhook secret must be between 16 and 64 characters');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error'
  });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

module.exports = {
  apiRateLimit,
  authRateLimit,
  uploadRateLimit,
  inviteRateLimit,
  handleValidationErrors,
  validateEmail,
  validateUrl,
  validateApiKey,
  validateWebhookSecret,
  errorHandler,
  requestLogger
};