const express = require('express');
const { AIConfig, WebhookConfig } = require('../models');
const AIService = require('../services/aiService');
const WebhookService = require('../services/webhookService');
const EncryptionService = require('../utils/encryption');
const { authenticate, authorize, validateOrganization } = require('../middleware/auth');
const { 
  handleValidationErrors, 
  validateApiKey, 
  validateUrl, 
  validateWebhookSecret 
} = require('../middleware/validation');
const { body } = require('express-validator');

const router = express.Router();

// Helper function to get default model for each provider
function getDefaultModel(provider) {
  switch (provider) {
    case 'openai': return 'gpt-4-vision-preview';
    case 'google': return 'gemini-pro-vision';
    case 'ollama': return 'llava:latest';
    case 'lmstudio': return 'llava-v1.6-vicuna-7b';
    default: return 'gpt-4-vision-preview';
  }
}

// Apply middleware to all config routes
router.use(authenticate);
router.use(validateOrganization);
router.use(authorize('admin'));

// AI Configuration Routes

// Get AI configuration
router.get('/ai', async (req, res) => {
  try {
    const aiConfig = await AIConfig.findOne({
      organization: req.user.organization._id
    });

    if (!aiConfig) {
      return res.json({
        success: true,
        data: null,
        message: 'No AI configuration found'
      });
    }

    res.json({
      success: true,
      data: aiConfig // Credentials are automatically hidden in toJSON method
    });

  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({
      error: 'Failed to fetch AI configuration',
      details: error.message
    });
  }
});

// Create or update AI configuration
router.put('/ai',
  body('provider').isIn(['openai', 'google', 'ollama', 'lmstudio']).withMessage('Provider must be openai, google, ollama, or lmstudio'),
  body('apiKey').optional().custom((value, { req }) => {
    const provider = req.body.provider;
    if ((provider === 'openai' || provider === 'google') && !value) {
      throw new Error('API key is required for cloud providers');
    }
    return true;
  }),
  body('baseUrl').optional().isURL({ require_protocol: true }).withMessage('Base URL must be a valid URL'),
  body('model').optional().isString().withMessage('Model must be a string'),
  body('maxTokens').optional().isInt({ min: 100, max: 4000 }).withMessage('Max tokens must be between 100 and 4000'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider, apiKey, baseUrl, model, maxTokens, temperature } = req.body;

      // Test the connection before saving
      const testResult = await AIService.testConnection(provider, apiKey, model, baseUrl);
      if (!testResult.success) {
        return res.status(400).json({
          error: 'Connection test failed',
          details: testResult.message
        });
      }

      // Prepare credentials object
      let credentials = {};
      
      if (provider === 'openai' || provider === 'google') {
        // Encrypt the API key for cloud providers
        const encryptedCredentials = EncryptionService.encryptApiKey(apiKey);
        credentials = encryptedCredentials;
      } else if (provider === 'ollama' || provider === 'lmstudio') {
        // Store base URL for local providers
        credentials.baseUrl = baseUrl || (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234');
      }

      // Prepare configuration object
      const configData = {
        organization: req.user.organization._id,
        provider,
        credentials,
        config: {
          model: model || getDefaultModel(provider),
          maxTokens: maxTokens || 1000,
          temperature: temperature !== undefined ? temperature : 0.1
        },
        isActive: true
      };

      // Update or create configuration
      const aiConfig = await AIConfig.findOneAndUpdate(
        { organization: req.user.organization._id },
        configData,
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: 'AI configuration saved successfully',
        data: aiConfig
      });

    } catch (error) {
      console.error('Error saving AI config:', error);
      res.status(500).json({
        error: 'Failed to save AI configuration',
        details: error.message
      });
    }
  }
);

// Get available models for a provider
router.post('/ai/models',
  body('provider').isIn(['openai', 'google', 'ollama', 'lmstudio']).withMessage('Invalid provider'),
  body('apiKey').optional().custom((value, { req }) => {
    const provider = req.body.provider;
    if ((provider === 'openai' || provider === 'google') && !value) {
      throw new Error('API key is required for cloud providers');
    }
    return true;
  }),
  body('baseUrl').optional().isURL({ require_protocol: true }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider, apiKey, baseUrl } = req.body;
      
      console.log(`🔍 Fetching models for provider: ${provider}`);
      
      const models = await AIService.getAvailableModels(provider, baseUrl, apiKey);
      
      console.log(`✅ Successfully fetched ${models?.length || 0} models for ${provider}`);
      
      res.json({
        success: true,
        models: models || []
      });
    } catch (error) {
      console.error(`❌ Error fetching models for ${req.body.provider}:`, error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch models',
        details: error.message
      });
    }
  }
);

// Test AI connection and get available models
router.post('/ai/test-connection',
  body('provider').isIn(['openai', 'google', 'ollama', 'lmstudio']).withMessage('Invalid provider'),
  body('apiKey').optional(),
  body('baseUrl').optional().isURL({ require_protocol: true }),
  body('model').optional().isString(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider, apiKey, baseUrl, model } = req.body;
      
      const testResult = await AIService.testConnection(provider, apiKey, model, baseUrl);
      
      res.json({
        success: testResult.success,
        message: testResult.message,
        availableModels: testResult.availableModels || []
      });
    } catch (error) {
      console.error('Error testing AI connection:', error);
      res.status(500).json({
        success: false,
        message: 'Connection test failed',
        details: error.message
      });
    }
  }
);

// Test AI configuration
router.post('/ai/test', async (req, res) => {
  try {
    const aiConfig = await AIConfig.findOne({
      organization: req.user.organization._id,
      isActive: true
    });

    if (!aiConfig) {
      return res.status(400).json({
        error: 'No AI configuration found'
      });
    }

    // Decrypt API key for testing
    const apiKey = EncryptionService.decryptApiKey(
      aiConfig.credentials.encryptedApiKey,
      aiConfig.credentials.iv,
      aiConfig.credentials.authTag
    );

    const testResult = await AIService.testConnection(
      aiConfig.provider,
      apiKey,
      aiConfig.config.model
    );

    res.json({
      success: testResult.success,
      message: testResult.message,
      provider: aiConfig.provider,
      model: aiConfig.config.model
    });

  } catch (error) {
    console.error('Error testing AI config:', error);
    res.status(500).json({
      error: 'Failed to test AI configuration',
      details: error.message
    });
  }
});

// Delete AI configuration
router.delete('/ai', async (req, res) => {
  try {
    const result = await AIConfig.findOneAndDelete({
      organization: req.user.organization._id
    });

    if (!result) {
      return res.status(404).json({
        error: 'AI configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'AI configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting AI config:', error);
    res.status(500).json({
      error: 'Failed to delete AI configuration',
      details: error.message
    });
  }
});

// Webhook Configuration Routes

// Get webhook configuration
router.get('/webhook', async (req, res) => {
  try {
    const webhookConfig = await WebhookConfig.findOne({
      organization: req.user.organization._id
    });

    if (!webhookConfig) {
      return res.json({
        success: true,
        data: null,
        message: 'No webhook configuration found'
      });
    }

    res.json({
      success: true,
      data: webhookConfig // Secret is automatically hidden in toJSON method
    });

  } catch (error) {
    console.error('Error fetching webhook config:', error);
    res.status(500).json({
      error: 'Failed to fetch webhook configuration',
      details: error.message
    });
  }
});

// Create or update webhook configuration
router.put('/webhook',
  validateUrl,
  validateWebhookSecret,
  body('events').optional().isObject().withMessage('Events must be an object'),
  body('retryConfig').optional().isObject().withMessage('Retry config must be an object'),
  body('headers').optional().isArray().withMessage('Headers must be an array'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { 
        url, 
        secret, 
        events = { cardExtracted: true },
        retryConfig = {},
        headers = []
      } = req.body;

      const configData = {
        organization: req.user.organization._id,
        url,
        secret,
        events: {
          cardExtracted: events.cardExtracted !== undefined ? events.cardExtracted : true,
          userAdded: events.userAdded || false,
          configChanged: events.configChanged || false
        },
        retryConfig: {
          maxRetries: retryConfig.maxRetries || 3,
          retryDelay: retryConfig.retryDelay || 1000,
          backoffMultiplier: retryConfig.backoffMultiplier || 2
        },
        headers,
        isActive: true
      };

      const webhookConfig = await WebhookConfig.findOneAndUpdate(
        { organization: req.user.organization._id },
        configData,
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: 'Webhook configuration saved successfully',
        data: webhookConfig
      });

    } catch (error) {
      console.error('Error saving webhook config:', error);
      res.status(500).json({
        error: 'Failed to save webhook configuration',
        details: error.message
      });
    }
  }
);

// Test webhook configuration
router.post('/webhook/test', async (req, res) => {
  try {
    const { testData } = req.body;

    const result = await WebhookService.testWebhook(
      req.user.organization._id,
      testData || { message: 'Test webhook from admin panel' }
    );

    res.json({
      success: true,
      message: 'Webhook test completed successfully',
      data: {
        status: result.status,
        responseTime: result.responseTime
      }
    });

  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(400).json({
      error: 'Webhook test failed',
      details: error.message
    });
  }
});

// Get webhook statistics
router.get('/webhook/stats', async (req, res) => {
  try {
    const webhookConfig = await WebhookConfig.findOne({
      organization: req.user.organization._id
    });

    if (!webhookConfig) {
      return res.status(404).json({
        error: 'Webhook configuration not found'
      });
    }

    // Get queue statistics
    const queueStats = await WebhookService.getQueueStats();

    res.json({
      success: true,
      data: {
        config: webhookConfig.stats,
        queue: queueStats,
        lastTriggered: webhookConfig.lastTriggered
      }
    });

  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({
      error: 'Failed to fetch webhook statistics',
      details: error.message
    });
  }
});

// Retry failed webhooks
router.post('/webhook/retry', async (req, res) => {
  try {
    const result = await WebhookService.retryFailedWebhooks(req.user.organization._id);

    res.json({
      success: true,
      message: `${result.retriedCount} failed webhooks queued for retry`,
      data: result
    });

  } catch (error) {
    console.error('Error retrying webhooks:', error);
    res.status(500).json({
      error: 'Failed to retry webhooks',
      details: error.message
    });
  }
});

// Delete webhook configuration
router.delete('/webhook', async (req, res) => {
  try {
    const result = await WebhookConfig.findOneAndDelete({
      organization: req.user.organization._id
    });

    if (!result) {
      return res.status(404).json({
        error: 'Webhook configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'Webhook configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting webhook config:', error);
    res.status(500).json({
      error: 'Failed to delete webhook configuration',
      details: error.message
    });
  }
});

module.exports = router;