const express = require('express');
const { User } = require('../models');
const AuthService = require('../utils/auth');
const { authenticate, authorize, validateOrganization } = require('../middleware/auth');
const { handleValidationErrors, validateEmail, inviteRateLimit } = require('../middleware/validation');
const auditLogger = require('../services/auditLogger');
const { body } = require('express-validator');

const router = express.Router();

// Apply middleware to all admin routes
router.use(authenticate);
router.use(validateOrganization);
router.use(authorize('admin'));

// Get all users in organization
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    
    const query = { organization: req.user.organization._id };
    
    // Add filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      User.find(query)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message
    });
  }
});

// Invite user to organization
router.post('/invite',
  inviteRateLimit, // Add rate limiting for invites
  validateEmail,
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, role = 'user' } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Check organization user limits
      const userCount = await User.countDocuments({ 
        organization: req.user.organization._id,
        isActive: true 
      });
      
      if (userCount >= req.user.organization.settings.maxUsers) {
        return res.status(400).json({ 
          error: 'Organization has reached maximum user limit',
          current: userCount,
          limit: req.user.organization.settings.maxUsers
        });
      }

      // Generate invite token
      const inviteToken = AuthService.generateInviteToken();
      const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create placeholder user with invite token
      const user = new User({
        email,
        name: email.split('@')[0], // Temporary name
        googleId: `invite_${Date.now()}_${Math.random()}`, // Temporary googleId
        organization: req.user.organization._id,
        role,
        isActive: false, // Will be activated when they sign in
        invitedBy: req.user._id,
        inviteToken,
        inviteExpires
      });

      await user.save();

      // Log admin action
      const requestInfo = auditLogger.extractRequestInfo(req);
      auditLogger.logAdminEvent({
        action: 'USER_INVITED',
        adminUserId: req.user._id.toString(),
        targetUserId: user._id.toString(),
        targetEmail: email,
        newValue: role,
        ip: requestInfo.ip,
        metadata: {
          organizationId: req.user.organization._id.toString(),
          inviteExpires: inviteExpires.toISOString()
        }
      });

      // In a real application, you would send an email here
      // For now, we'll return the invite information
      const inviteLink = `${process.env.FRONTEND_URL}/invite/${inviteToken}`;

      res.json({
        success: true,
        message: 'User invited successfully',
        data: {
          userId: user._id,
          email: user.email,
          role: user.role,
          inviteToken,
          inviteLink,
          expiresAt: inviteExpires
        }
      });

    } catch (error) {
      console.error('Error inviting user:', error);
      res.status(500).json({
        error: 'Failed to invite user',
        details: error.message
      });
    }
  }
);

// Update user role
router.put('/:userId/role',
  body('role').isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Prevent admin from changing their own role
      if (userId === req.user._id.toString()) {
        return res.status(400).json({ error: 'Cannot change your own role' });
      }

      // Ensure at least one admin remains
      if (role === 'user') {
        const adminCount = await User.countDocuments({
          organization: req.user.organization._id,
          role: 'admin',
          isActive: true,
          _id: { $ne: userId }
        });

        if (adminCount === 0) {
          return res.status(400).json({ 
            error: 'Cannot remove the last admin. Promote another user to admin first.' 
          });
        }
      }

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          organization: req.user.organization._id
        },
        { role },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: user
      });

    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        error: 'Failed to update user role',
        details: error.message
      });
    }
  }
);

// Deactivate/activate user
router.put('/:userId/status',
  body('isActive').isBoolean().withMessage('isActive must be boolean'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      // Prevent admin from deactivating themselves
      if (userId === req.user._id.toString() && !isActive) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      // If deactivating an admin, ensure at least one admin remains
      if (!isActive) {
        const user = await User.findById(userId);
        if (user && user.role === 'admin') {
          const activeAdminCount = await User.countDocuments({
            organization: req.user.organization._id,
            role: 'admin',
            isActive: true,
            _id: { $ne: userId }
          });

          if (activeAdminCount === 0) {
            return res.status(400).json({ 
              error: 'Cannot deactivate the last admin. Promote another user to admin first.' 
            });
          }
        }
      }

      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          organization: req.user.organization._id
        },
        { isActive },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: user
      });

    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        error: 'Failed to update user status',
        details: error.message
      });
    }
  }
);

// Remove user from organization
router.delete('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from removing themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot remove your own account' });
    }

    const user = await User.findOne({
      _id: userId,
      organization: req.user.organization._id
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If removing an admin, ensure at least one admin remains
    if (user.role === 'admin') {
      const activeAdminCount = await User.countDocuments({
        organization: req.user.organization._id,
        role: 'admin',
        isActive: true,
        _id: { $ne: userId }
      });

      if (activeAdminCount === 0) {
        return res.status(400).json({ 
          error: 'Cannot remove the last admin. Promote another user to admin first.' 
        });
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User removed successfully'
    });

  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({
      error: 'Failed to remove user',
      details: error.message
    });
  }
});

// Get user activity/statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30d' } = req.query;

    const user = await User.findOne({
      _id: userId,
      organization: req.user.organization._id
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case '30d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case '90d':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } };
        break;
    }

    const CardData = require('../models').CardData;
    
    const [totalCards, periodCards, avgProcessingTime] = await Promise.all([
      CardData.countDocuments({ extractedBy: userId }),
      CardData.countDocuments({ extractedBy: userId, ...dateFilter }),
      CardData.aggregate([
        { $match: { extractedBy: userId, ...dateFilter } },
        { $group: { _id: null, avgTime: { $avg: '$processingTime' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          joinedAt: user.createdAt,
          lastLogin: user.lastLogin
        },
        stats: {
          totalCards,
          periodCards,
          avgProcessingTime: avgProcessingTime[0]?.avgTime || 0,
          period
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Failed to fetch user statistics',
      details: error.message
    });
  }
});

module.exports = router;