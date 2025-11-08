const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      { 
        id: user._id,
        email: user.email,
        organizationId: user.organization,
        role: user.role
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'card-extractor'
      }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token: ' + error.message);
    }
  }

  async getUserFromToken(token) {
    try {
      const decoded = this.verifyToken(token);
      const user = await User.findById(decoded.id).populate('organization');
      
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return user;
    } catch (error) {
      throw new Error('Authentication failed: ' + error.message);
    }
  }

  generateInviteToken() {
    return jwt.sign(
      { purpose: 'invite' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  verifyInviteToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose !== 'invite') {
        throw new Error('Invalid invite token');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired invite token');
    }
  }

  async createOrganizationFromDomain(email) {
    const domain = email.split('@')[1];
    const name = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    
    return {
      name: `${name} Organization`,
      domain: domain
    };
  }

  generateRandomPassword() {
    return Math.random().toString(36).slice(-12);
  }
}

module.exports = new AuthService();