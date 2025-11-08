const OpenAI = require('openai');
const axios = require('axios');
const sharp = require('sharp');
const { AIConfig } = require('../models');
const EncryptionService = require('../utils/encryption');

class AIService {
  constructor() {
    this.extractionPrompt = `
You are an expert at extracting structured data from business card images. 
Extract the following information and return ONLY a valid JSON object with these exact fields:

{
  "name": "Full name of the person",
  "title": "Job title or position",
  "company": "Company or organization name",
  "phoneNumbers": [
    {
      "type": "mobile|office|home|fax|other",
      "number": "formatted phone number"
    }
  ],
  "emails": [
    {
      "type": "work|personal|other", 
      "email": "email address"
    }
  ],
  "website": "company website URL",
  "address": {
    "street": "street address",
    "city": "city",
    "state": "state/province", 
    "country": "country",
    "zipCode": "postal code",
    "full": "complete address as written"
  },
  "socials": [
    {
      "platform": "linkedin|twitter|facebook|instagram|other",
      "url": "social media URL",
      "username": "username without @ symbol"
    }
  ]
}

Rules:
- Return ONLY valid JSON, no other text
- Use null for missing fields
- Ensure phone numbers are properly formatted
- Include country codes where visible
- Extract all visible contact information
- Be accurate and preserve original formatting where appropriate
`;
  }

  async processBusinessCard(imageBuffer, organizationId) {
    try {
      const startTime = Date.now();
      
      // Get AI configuration for the organization
      const aiConfig = await AIConfig.findOne({ 
        organization: organizationId, 
        isActive: true 
      });

      if (!aiConfig) {
        throw new Error('No AI configuration found for this organization');
      }

      // Decrypt the API key (only for cloud providers)
      let apiKey = null;
      if (aiConfig.credentials.encryptedApiKey) {
        apiKey = EncryptionService.decryptApiKey(
          aiConfig.credentials.encryptedApiKey,
          aiConfig.credentials.iv,
          aiConfig.credentials.authTag
        );
      }

      // Process image - convert to base64 and optimize
      const processedImage = await this.preprocessImage(imageBuffer);
      
      let extractedData;
      if (aiConfig.provider === 'openai') {
        extractedData = await this.processWithOpenAI(processedImage, aiConfig, apiKey);
      } else if (aiConfig.provider === 'google') {
        extractedData = await this.processWithGoogle(processedImage, aiConfig, apiKey);
      } else if (aiConfig.provider === 'ollama') {
        extractedData = await this.processWithOllama(processedImage, aiConfig);
      } else if (aiConfig.provider === 'lmstudio') {
        extractedData = await this.processWithLMStudio(processedImage, aiConfig);
      } else {
        throw new Error('Unsupported AI provider');
      }

      const processingTime = Date.now() - startTime;

      // Update usage statistics
      await this.updateUsageStats(aiConfig._id, processingTime);

      return {
        data: extractedData,
        processingTime,
        aiProvider: aiConfig.provider,
        confidence: extractedData.confidence || 0.8
      };

    } catch (error) {
      console.error('AI processing error:', error);
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

  async preprocessImage(imageBuffer) {
    try {
      // Optimize image for AI processing
      const processedBuffer = await sharp(imageBuffer)
        .resize(1024, 1024, { 
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      return processedBuffer.toString('base64');
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async processWithOpenAI(base64Image, config, apiKey) {
    try {
      const openai = new OpenAI({ apiKey });

      const response = await openai.chat.completions.create({
        model: config.config.model,
        max_tokens: config.config.maxTokens,
        temperature: config.config.temperature,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: this.extractionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      });

      const content = response.choices[0].message.content.trim();
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        // Try to extract JSON from the response if it's wrapped in other text
        const jsonMatch = content.match(/\{.*\}/s);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from AI');
        }
      }

      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      throw new Error(`OpenAI processing failed: ${error.message}`);
    }
  }

  async processWithGoogle(base64Image, config, apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.config.model}:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [
          {
            parts: [
              { text: this.extractionPrompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: config.config.maxTokens,
          temperature: config.config.temperature
        }
      };

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.candidates || !response.data.candidates[0]) {
        throw new Error('No response from Google AI');
      }

      const content = response.data.candidates[0].content.parts[0].text.trim();
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/\{.*\}/s);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from AI');
        }
      }

      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      throw new Error(`Google AI processing failed: ${error.message}`);
    }
  }

  async processWithOllama(base64Image, config) {
    try {
      const baseUrl = config.credentials.baseUrl || 'http://localhost:11434';
      const url = `${baseUrl}/api/generate`;
      
      const requestBody = {
        model: config.config.model,
        prompt: this.extractionPrompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: config.config.temperature,
          num_predict: config.config.maxTokens
        }
      };

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for local processing
      });

      if (!response.data || !response.data.response) {
        throw new Error('No response from Ollama');
      }

      const content = response.data.response.trim();
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/\{.*\}/s);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from Ollama');
        }
      }

      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      throw new Error(`Ollama processing failed: ${error.message}`);
    }
  }

  async processWithLMStudio(base64Image, config) {
    try {
      const baseUrl = config.credentials.baseUrl || 'http://localhost:1234';
      const url = `${baseUrl}/v1/chat/completions`;
      
      const requestBody = {
        model: config.config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: this.extractionPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: config.config.maxTokens,
        temperature: config.config.temperature,
        stream: false
      };

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minutes timeout for local processing
      });

      if (!response.data.choices || !response.data.choices[0]) {
        throw new Error('No response from LM Studio');
      }

      const content = response.data.choices[0].message.content.trim();
      
      // Parse the JSON response
      let extractedData;
      try {
        extractedData = JSON.parse(content);
      } catch (parseError) {
        const jsonMatch = content.match(/\{.*\}/s);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from LM Studio');
        }
      }

      return this.validateAndNormalizeData(extractedData);
    } catch (error) {
      throw new Error(`LM Studio processing failed: ${error.message}`);
    }
  }

  validateAndNormalizeData(data) {
    // Ensure required structure exists
    const normalizedData = {
      name: data.name || null,
      title: data.title || null,
      company: data.company || null,
      phoneNumbers: Array.isArray(data.phoneNumbers) ? data.phoneNumbers : [],
      emails: Array.isArray(data.emails) ? data.emails : [],
      website: data.website || null,
      address: data.address || {},
      socials: Array.isArray(data.socials) ? data.socials : []
    };

    // Validate and clean phone numbers
    normalizedData.phoneNumbers = normalizedData.phoneNumbers
      .filter(phone => phone.number)
      .map(phone => ({
        type: phone.type || 'mobile',
        number: phone.number.trim()
      }));

    // Validate and clean emails
    normalizedData.emails = normalizedData.emails
      .filter(email => email.email && this.isValidEmail(email.email))
      .map(email => ({
        type: email.type || 'work',
        email: email.email.toLowerCase().trim()
      }));

    // Validate and clean socials
    normalizedData.socials = normalizedData.socials
      .filter(social => social.url || social.username)
      .map(social => ({
        platform: social.platform || 'other',
        url: social.url ? social.url.trim() : null,
        username: social.username ? social.username.replace('@', '').trim() : null
      }));

    return normalizedData;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async updateUsageStats(configId, processingTime) {
    try {
      await AIConfig.findByIdAndUpdate(configId, {
        $inc: {
          'usage.totalRequests': 1,
          'usage.totalTokens': 100 // Approximate, could be more precise
        },
        lastUsed: new Date()
      });
    } catch (error) {
      console.error('Failed to update usage stats:', error);
    }
  }

  async getAvailableModels(provider, baseUrl, apiKey) {
    try {
      if (provider === 'openai') {
        if (!apiKey) {
          throw new Error('API key is required for OpenAI');
        }
        const openai = new OpenAI({ apiKey });
        const response = await openai.models.list();
        // Filter for vision-capable models and GPT models
        const visionModels = response.data.filter(model => {
          const modelId = model.id.toLowerCase();
          return (modelId.includes('gpt-4') && modelId.includes('vision')) || 
                 modelId.includes('gpt-4o') ||
                 modelId.includes('gpt-4-turbo') ||
                 modelId === 'gpt-4-vision-preview' ||
                 modelId === 'gpt-4-1106-vision-preview';
        });
        return visionModels.map(m => ({
          id: m.id,
          name: m.id,
          created: m.created,
          owned_by: m.owned_by
        }));
      } else if (provider === 'google') {
        if (!apiKey) {
          throw new Error('API key is required for Google AI');
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        
        console.log('🔍 Fetching Google AI models...');
        console.log('🌐 API URL:', url);
        
        try {
          const response = await axios.get(url, { 
            timeout: 30000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'VisitingCardExtractor/1.0'
            },
            validateStatus: function (status) {
              return status < 500; // Accept anything below 500 as valid for better error handling
            }
          });
          
          console.log(`📊 Response status: ${response.status}`);
          console.log(`✅ Successfully fetched ${response.data.models?.length || 0} Google AI models`);
          
          if (response.status !== 200) {
            throw new Error(`Google AI API returned status ${response.status}: ${response.data.error?.message || 'Unknown error'}`);
          }
          
          const models = response.data.models || [];
          // Filter for vision-capable models
          const visionModels = models.filter(model => {
            const capabilities = model.supportedGenerationMethods || [];
            const modelName = model.name.toLowerCase();
            return capabilities.includes('generateContent') && 
                   (modelName.includes('vision') || modelName.includes('pro-vision') || modelName.includes('gemini'));
          });
          
          console.log(`🎯 Filtered to ${visionModels.length} vision-capable models`);
          
          return visionModels.map(m => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', ''),
            description: m.description,
            inputTokenLimit: m.inputTokenLimit,
            outputTokenLimit: m.outputTokenLimit
          }));
        } catch (googleError) {
          console.error('❌ Google AI API error:', googleError.message);
          if (googleError.code === 'ECONNABORTED') {
            throw new Error('Google AI API request timed out. Please try again.');
          }
          if (googleError.response?.status === 400) {
            throw new Error('Invalid Google AI API key or request format');
          }
          if (googleError.response?.status === 403) {
            throw new Error('Google AI API access denied. Check your API key permissions');
          }
          throw new Error(`Google AI API error: ${googleError.message}`);
        }
      } else if (provider === 'ollama') {
        const ollamaUrl = baseUrl || 'http://localhost:11434';
        
        console.log(`🔍 Fetching Ollama models from: ${ollamaUrl}`);
        
        try {
          const response = await axios.get(`${ollamaUrl}/api/tags`, { 
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'VisitingCardExtractor/1.0'
            }
          });
          
          const models = response.data.models || [];
          console.log(`📦 Found ${models.length} total models in Ollama`);
          
          // Filter for vision-capable models
          const visionModels = models.filter(model => {
            const modelName = model.name.toLowerCase();
            return modelName.includes('llava') || 
                   modelName.includes('bakllava') || 
                   modelName.includes('vision');
          });
          
          console.log(`🎯 Filtered to ${visionModels.length} vision-capable models`);
          
          if (models.length > 0 && visionModels.length === 0) {
            console.log('⚠️  No vision-capable models found. Available models:', models.map(m => m.name).join(', '));
          }
          
          return visionModels.map(m => ({
            id: m.name,
            name: m.name,
            size: m.size || 0,
            modified: m.modified_at,
            digest: m.digest
          }));
        } catch (ollamaError) {
          console.error('❌ Ollama API error:', ollamaError.message);
          if (ollamaError.code === 'ECONNREFUSED') {
            throw new Error(`Cannot connect to Ollama at ${ollamaUrl}. Make sure Ollama is running.`);
          }
          if (ollamaError.code === 'ECONNABORTED') {
            throw new Error('Ollama request timed out. Check if Ollama is responding.');
          }
          if (ollamaError.response?.status === 404) {
            throw new Error('Ollama API endpoint not found. Check the base URL and Ollama version.');
          }
          throw new Error(`Ollama error: ${ollamaError.message}`);
        }
      } else if (provider === 'lmstudio') {
        const lmStudioUrl = baseUrl || 'http://localhost:1234';
        
        console.log(`🔍 Fetching LM Studio models from: ${lmStudioUrl}`);
        
        try {
          const response = await axios.get(`${lmStudioUrl}/v1/models`, { 
            timeout: 15000,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'VisitingCardExtractor/1.0'
            }
          });
          
          const models = response.data.data || [];
          console.log(`📦 Found ${models.length} total models in LM Studio`);
          
          // Filter for vision-capable models
          const visionModels = models.filter(model => {
            const modelId = model.id.toLowerCase();
            return modelId.includes('llava') || 
                   modelId.includes('bakllava') || 
                   modelId.includes('vision');
          });
          
          console.log(`🎯 Filtered to ${visionModels.length} vision-capable models`);
          
          if (models.length > 0 && visionModels.length === 0) {
            console.log('⚠️  No vision-capable models found. Available models:', models.map(m => m.id).join(', '));
          }
          
          return visionModels.map(m => ({
            id: m.id,
            name: m.id,
            object: m.object,
            created: m.created
          }));
        } catch (lmStudioError) {
          console.error('❌ LM Studio API error:', lmStudioError.message);
          if (lmStudioError.code === 'ECONNREFUSED') {
            throw new Error(`Cannot connect to LM Studio at ${lmStudioUrl}. Make sure LM Studio is running.`);
          }
          if (lmStudioError.code === 'ECONNABORTED') {
            throw new Error('LM Studio request timed out. Check if LM Studio is responding.');
          }
          if (lmStudioError.response?.status === 404) {
            throw new Error('LM Studio API endpoint not found. Check the base URL and ensure the server is running.');
          }
          throw new Error(`LM Studio error: ${lmStudioError.message}`);
        }
      }
      return [];
    } catch (error) {
      console.error(`❌ Error in getAvailableModels for ${provider}:`, error.message);
      
      // If the error is already formatted (like from Google AI), just re-throw it
      if (error.message.includes('Google AI API') || 
          error.message.includes('timed out') || 
          error.message.includes('Invalid Google AI API key')) {
        throw error;
      }
      
      // Handle common connection errors
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Connection refused. Make sure ${provider} is running on ${baseUrl || 'default port'}.`);
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Request timed out. Please check your ${provider} connection.`);
      }
      if (error.response?.status === 401) {
        throw new Error(`Invalid API key for ${provider}`);
      }
      if (error.response?.status === 403) {
        throw new Error(`Access denied. Please check your ${provider} API key permissions.`);
      }
      
      throw new Error(`Failed to fetch models: ${error.message}`);
    }
  }

  async testConnection(provider, apiKey, model, baseUrl) {
    try {
      if (provider === 'openai') {
        const openai = new OpenAI({ apiKey });
        await openai.models.list();
        return { success: true, message: 'OpenAI connection successful' };
      } else if (provider === 'google') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        await axios.get(url);
        return { success: true, message: 'Google AI connection successful' };
      } else if (provider === 'ollama') {
        const ollamaUrl = baseUrl || 'http://localhost:11434';
        const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 5000 });
        const models = response.data.models || [];
        const modelExists = models.some(m => m.name === model || m.name.startsWith(model.split(':')[0]));
        if (!modelExists) {
          return { success: false, message: `Model ${model} not found. Available models: ${models.map(m => m.name).join(', ')}` };
        }
        return { success: true, message: 'Ollama connection successful', availableModels: models.map(m => m.name) };
      } else if (provider === 'lmstudio') {
        const lmStudioUrl = baseUrl || 'http://localhost:1234';
        const response = await axios.get(`${lmStudioUrl}/v1/models`, { timeout: 5000 });
        const models = response.data.data || [];
        const modelExists = models.some(m => m.id === model);
        if (!modelExists && models.length > 0) {
          return { success: false, message: `Model ${model} not found. Available models: ${models.map(m => m.id).join(', ')}` };
        }
        return { success: true, message: 'LM Studio connection successful', availableModels: models.map(m => m.id) };
      }
      return { success: false, message: 'Unsupported provider' };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return { success: false, message: `Connection refused. Make sure ${provider} is running on ${baseUrl || 'default port'}.` };
      }
      return { success: false, message: error.message };
    }
  }
}

module.exports = new AIService();