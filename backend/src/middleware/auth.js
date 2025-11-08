const AuthService = require('../utils/auth');
const { User } = require('../models');
const tokenBlacklist = require('../services/tokenBlacklist');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. Invalid token format.' });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Access denied. Token has been revoked.' });
    }

    const user = await AuthService.getUserFromToken(token);
    
    // Check if user's tokens were invalidated due to security events
    const decoded = AuthService.verifyToken(token);
    if (tokenBlacklist.isUserTokenInvalidated(user._id.toString(), decoded.iat)) {
      return res.status(401).json({ error: 'Access denied. Token invalidated due to security event.' });
    }
    
    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

const validateOrganization = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.organization) {
      return res.status(400).json({ error: 'User is not associated with an organization' });
    }

    if (!req.user.organization.isActive) {
      return res.status(403).json({ error: 'Organization is not active' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Organization validation failed' });
  }
};

const checkSubscriptionLimits = async (req, res, next) => {
  try {
    const organization = req.user.organization;
    
    if (organization.subscription.plan === 'free' && 
        organization.subscription.cardsProcessedThisMonth >= organization.subscription.monthlyLimit) {
      return res.status(429).json({ 
        error: 'Monthly processing limit reached. Please upgrade your plan.',
        currentUsage: organization.subscription.cardsProcessedThisMonth,
        limit: organization.subscription.monthlyLimit
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Subscription validation failed' });
  }
};

module.exports = {
  authenticate,
  authorize,
  validateOrganization,
  checkSubscriptionLimits
};