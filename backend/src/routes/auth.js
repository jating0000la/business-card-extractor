const express = require('express');
const { User, Organization } = require('../models');
const AuthService = require('../utils/auth');
const FirebaseAuthService = require('../utils/firebaseAuth');
const tokenBlacklist = require('../services/tokenBlacklist');
const auditLogger = require('../services/auditLogger');
const { SecurityConfig } = require('../config/security');
const { authRateLimit, handleValidationErrors } = require('../middleware/validation');
const { body } = require('express-validator');
const { createValidators } = require('../services/validationService');

const router = express.Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Firebase Google OAuth login
router.post('/google', 
  body('token').notEmpty().withMessage('Firebase ID token is required')
    .custom(token => {
      // Basic JWT format validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }
      return true;
    }),
  createValidators.sanitizeBody([]), // Sanitize all inputs
  handleValidationErrors,
  async (req, res) => {
    try {
      const { token } = req.body;

      // Verify Firebase ID token
      const firebaseUser = await FirebaseAuthService.verifyIdToken(token);
      const { uid: googleId, email, name, picture } = firebaseUser;

      if (!email) {
        return res.status(400).json({ error: 'Email not provided by Firebase' });
      }

      // Check if user exists
      let user = await User.findOne({ googleId }).populate('organization');
      
      if (!user) {
        // Check if email exists (could be an invited user)
        const existingUser = await User.findOne({ email }).populate('organization');
        
        if (existingUser) {
          // Check if this is an invited user (has temporary googleId starting with 'invite_')
          if (existingUser.googleId && existingUser.googleId.startsWith('invite_')) {
            // This is an invited user completing their registration
            
            // Check if invite token is still valid
            if (existingUser.inviteExpires && existingUser.inviteExpires > new Date()) {
              // Update the user with real Google credentials
              existingUser.googleId = googleId;
              existingUser.name = name;
              existingUser.picture = picture;
              existingUser.isActive = true; // Activate the account
              existingUser.lastLogin = new Date();
              
              // Clear invite-related fields
              existingUser.inviteToken = undefined;
              existingUser.inviteExpires = undefined;
              
              await existingUser.save();
              user = existingUser;
              
              console.log(`✅ Invited user ${email} successfully completed registration`);
            } else {
              return res.status(400).json({ 
                error: 'Invite token has expired. Please contact your admin for a new invitation.' 
              });
            }
          } else {
            // Email exists with a different Google account
            return res.status(400).json({ 
              error: 'Email already registered with different Google account' 
            });
          }
        } else {
          // New user - validate domain and create new organization
          const domain = email.split('@')[1];
          const domainValidation = SecurityConfig.validateDomain(domain);
          
          if (!domainValidation.allowed) {
            // Log security event for blocked domain
            const requestInfo = auditLogger.extractRequestInfo(req);
            auditLogger.logSecurityEvent({
              action: 'DOMAIN_BLOCKED',
              userId: null,
              ip: requestInfo.ip,
              severity: domainValidation.severity || 'medium',
              details: {
                domain: domain,
                email: email,
                reason: domainValidation.reason
              }
            });
            
            return res.status(403).json({
              error: 'Domain not allowed for organization creation',
              details: domainValidation.reason
            });
          }
          
          // Create new organization and user (first user becomes admin)
          const orgData = await AuthService.createOrganizationFromDomain(email);
          
          const organization = new Organization({
            ...orgData,
            admin: null // Will be set after user creation
          });
          
          await organization.save();
          
          // Log organization creation
          const requestInfo = auditLogger.extractRequestInfo(req);
          auditLogger.logSecurityEvent({
            action: 'ORGANIZATION_CREATED',
            userId: null,
            ip: requestInfo.ip,
            severity: 'low',
            details: {
              domain: domain,
              organizationId: organization._id.toString(),
              organizationName: orgData.name
            }
          });

          // Create user as admin
          user = new User({
            googleId,
            email,
            name,
            picture,
            organization: organization._id,
            role: 'admin'
          });

          await user.save();

          // Update organization with admin reference
          organization.admin = user._id;
          await organization.save();

          // Populate organization for response
          user = await User.findById(user._id).populate('organization');
          
          console.log(`✅ New organization created for ${email} as admin`);
        }
      } else {
        // Update last login and user info
        user.lastLogin = new Date();
        user.name = name;
        user.picture = picture;
        await user.save();
        
        console.log(`✅ Existing user ${email} logged in successfully`);
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }

      // Check if organization is active
      if (!user.organization.isActive) {
        return res.status(403).json({ error: 'Organization is deactivated' });
      }

      // Generate JWT token
      const jwtToken = AuthService.generateToken(user);

      // Log successful authentication
      const requestInfo = auditLogger.extractRequestInfo(req);
      auditLogger.logAuthEvent({
        action: 'LOGIN_SUCCESS',
        userId: user._id.toString(),
        email: user.email,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        success: true,
        metadata: {
          organizationId: user.organization._id.toString(),
          role: user.role,
          loginMethod: 'google_oauth'
        }
      });

      res.json({
        success: true,
        token: jwtToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
          role: user.role,
          organization: {
            id: user.organization._id,
            name: user.organization.name,
            domain: user.organization.domain
          }
        }
      });

    } catch (error) {
      console.error('Google auth error:', error);
      
      // Log failed authentication attempt
      const requestInfo = auditLogger.extractRequestInfo(req);
      auditLogger.logAuthEvent({
        action: 'LOGIN_FAILED',
        userId: null,
        email: req.body?.email || 'unknown',
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        success: false,
        errorMessage: error.message,
        metadata: {
          loginMethod: 'google_oauth',
          errorType: error.name || 'unknown'
        }
      });
      
      // Sanitize error messages for production
      let sanitizedError = 'Authentication failed';
      let shouldIncludeDetails = process.env.NODE_ENV !== 'production';
      
      // Only expose specific safe error messages
      if (error.message === 'Invalid Firebase token' || 
          error.message === 'Email not provided by Firebase' ||
          error.message.includes('Invite token has expired') ||
          error.message.includes('Email already registered')) {
        sanitizedError = error.message;
        shouldIncludeDetails = false; // Don't expose internal details even in dev
      }
      
      const response = { error: sanitizedError };
      if (shouldIncludeDetails && error.message) {
        response.details = error.message;
      }
      
      res.status(400).json(response);
    }
  }
);

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await AuthService.getUserFromToken(token);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        organization: {
          id: user.organization._id,
          name: user.organization.name,
          domain: user.organization.domain
        }
      }
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    
    // Sanitize token verification errors
    const response = { error: 'Token verification failed' };
    if (process.env.NODE_ENV !== 'production' && error.message) {
      response.details = error.message;
    }
    
    res.status(401).json(response);
  }
});

// Logout endpoint (blacklist token)
router.post('/logout', (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = AuthService.verifyToken(token);
          userId = decoded.id;
          tokenBlacklist.blacklistToken(token);
          console.log('✅ Token blacklisted on logout');
          
          // Log security event for token blacklisting
          const requestInfo = auditLogger.extractRequestInfo(req);
          auditLogger.logSecurityEvent({
            action: 'TOKEN_BLACKLISTED',
            userId: userId,
            ip: requestInfo.ip,
            severity: 'low',
            details: { reason: 'user_logout' }
          });
        } catch (tokenError) {
          console.error('Error processing logout token:', tokenError);
        }
      }
    }
    
    // Log logout event
    const requestInfo = auditLogger.extractRequestInfo(req);
    auditLogger.logAuthEvent({
      action: 'LOGOUT',
      userId: userId,
      email: null,
      ip: requestInfo.ip,
      userAgent: requestInfo.userAgent,
      success: true
    });
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await AuthService.getUserFromToken(token);
    
    // Generate new token
    const newToken = AuthService.generateToken(user);

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh failed:', error);
    
    // Sanitize refresh errors
    const response = { error: 'Token refresh failed' };
    if (process.env.NODE_ENV !== 'production' && error.message) {
      response.details = error.message;
    }
    
    res.status(401).json(response);
  }
});

module.exports = router;