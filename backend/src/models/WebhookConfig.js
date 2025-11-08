const mongoose = require('mongoose');

const webhookConfigSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP or HTTPS URL'
    }
  },
  secret: {
    type: String,
    required: true,
    minlength: 16
  },
  isActive: {
    type: Boolean,
    default: true
  },
  events: {
    cardExtracted: {
      type: Boolean,
      default: true
    },
    userAdded: {
      type: Boolean,
      default: false
    },
    configChanged: {
      type: Boolean,
      default: false
    }
  },
  retryConfig: {
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    },
    retryDelay: {
      type: Number,
      default: 1000, // milliseconds
      min: 100
    },
    backoffMultiplier: {
      type: Number,
      default: 2,
      min: 1
    }
  },
  headers: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  lastTriggered: {
    type: Date
  },
  stats: {
    totalSent: {
      type: Number,
      default: 0
    },
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

webhookConfigSchema.methods.toJSON = function() {
  const config = this.toObject();
  // Don't expose the secret in JSON responses
  delete config.secret;
  delete config.__v;
  return config;
};

webhookConfigSchema.index({ organization: 1 });

module.exports = mongoose.model('WebhookConfig', webhookConfigSchema);