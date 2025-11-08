const mongoose = require('mongoose');

const cardDataSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  extractedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  data: {
    name: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    phoneNumbers: [{
      type: {
        type: String,
        enum: ['mobile', 'office', 'home', 'fax', 'other'],
        default: 'mobile'
      },
      number: {
        type: String,
        trim: true
      }
    }],
    emails: [{
      type: {
        type: String,
        enum: ['work', 'personal', 'other'],
        default: 'work'
      },
      email: {
        type: String,
        lowercase: true,
        trim: true
      }
    }],
    website: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      full: String
    },
    socials: [{
      platform: {
        type: String,
        enum: ['linkedin', 'twitter', 'facebook', 'instagram', 'other']
      },
      url: {
        type: String,
        trim: true
      },
      username: {
        type: String,
        trim: true
      }
    }]
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  aiProvider: {
    type: String,
    enum: ['openai', 'google'],
    required: true
  },
  processingTime: {
    type: Number // in milliseconds
  },
  webhookSent: {
    type: Boolean,
    default: false
  },
  webhookResponse: {
    status: Number,
    sentAt: Date,
    retryCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

cardDataSchema.methods.toJSON = function() {
  const card = this.toObject();
  delete card.__v;
  return card;
};

// Optimized compound indexes for common queries
cardDataSchema.index({ organization: 1, createdAt: -1 });
cardDataSchema.index({ organization: 1, extractedBy: 1 });
cardDataSchema.index({ organization: 1, 'data.name': 1 });
cardDataSchema.index({ organization: 1, 'data.company': 1 });
cardDataSchema.index({ organization: 1, 'data.emails.email': 1 });
cardDataSchema.index({ webhookSent: 1 }, { sparse: true });

module.exports = mongoose.model('CardData', cardDataSchema);