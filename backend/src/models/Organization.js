const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false  // Allow null initially, will be set after user creation
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowUserInvites: {
      type: Boolean,
      default: true
    },
    maxUsers: {
      type: Number,
      default: 50
    },
    dataRetentionDays: {
      type: Number,
      default: 365
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    expiresAt: {
      type: Date
    },
    cardsProcessedThisMonth: {
      type: Number,
      default: 0
    },
    monthlyLimit: {
      type: Number,
      default: 100
    }
  }
}, {
  timestamps: true
});

organizationSchema.methods.toJSON = function() {
  const org = this.toObject();
  delete org.__v;
  return org;
};

// Optimized indexes (unique fields already indexed)
organizationSchema.index({ isActive: 1, 'subscription.plan': 1 });
organizationSchema.index({ 'subscription.expiresAt': 1 });

module.exports = mongoose.model('Organization', organizationSchema);