const mongoose = require('mongoose');

const aiConfigSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true
  },
  provider: {
    type: String,
    enum: ['openai', 'google', 'ollama', 'lmstudio'],
    required: true
  },
  credentials: {
    // Encrypted credentials stored here (optional for local providers)
    encryptedApiKey: {
      type: String,
      required: function() {
        return this.provider === 'openai' || this.provider === 'google';
      }
    },
    iv: {
      type: String,
      required: function() {
        return this.provider === 'openai' || this.provider === 'google';
      }
    },
    // For local AI services (Ollama, LM Studio)
    baseUrl: {
      type: String,
      default: function() {
        if (this.provider === 'ollama') return 'http://localhost:11434';
        if (this.provider === 'lmstudio') return 'http://localhost:1234';
        return null;
      }
    },
    authTag: String
  },
  config: {
    model: {
      type: String,
      default: function() {
        if (this.provider === 'openai') return 'gpt-4-vision-preview';
        if (this.provider === 'google') return 'gemini-pro-vision';
        if (this.provider === 'ollama') return 'llava:latest';
        if (this.provider === 'lmstudio') return 'llava-v1.6-vicuna-7b';
        return 'gpt-4-vision-preview';
      }
    },
    maxTokens: {
      type: Number,
      default: 1000
    },
    temperature: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 2
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    costEstimate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

aiConfigSchema.methods.toJSON = function() {
  const config = this.toObject();
  // Never expose encrypted credentials in JSON
  delete config.credentials;
  delete config.__v;
  return config;
};

aiConfigSchema.index({ organization: 1 });

module.exports = mongoose.model('AIConfig', aiConfigSchema);