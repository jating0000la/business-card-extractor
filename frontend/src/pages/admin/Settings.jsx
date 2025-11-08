import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { config } from '../../utils/api';
import { 
  Settings, 
  Bot, 
  Webhook, 
  Save, 
  TestTube, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('ai');
  const [aiConfig, setAiConfig] = useState(null);
  const [webhookConfig, setWebhookConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const aiFormRef = useRef(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Fetch models when aiConfig changes for local providers
  useEffect(() => {
    if (aiConfig && (aiConfig.provider === 'ollama' || aiConfig.provider === 'lmstudio')) {
      fetchAvailableModels(aiConfig.provider, aiConfig.credentials?.baseUrl);
    }
  }, [aiConfig]);

  // Auto-fetch models when Ollama or LM Studio is selected
  useEffect(() => {
    console.log('Provider changed to:', selectedProvider);
    
    // Always clear models when provider changes
    setAvailableModels([]);
    setSelectedModel('');
    
    if (selectedProvider === 'ollama' || selectedProvider === 'lmstudio') {
      console.log('Auto-fetching models for', selectedProvider);
      // Don't auto-fetch for now to avoid the error, let user manually fetch
      // fetchAvailableModels(selectedProvider, defaultUrl);
    }
  }, [selectedProvider]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const [aiResponse, webhookResponse] = await Promise.all([
        config.getAIConfig().catch(() => ({ data: { data: null } })),
        config.getWebhookConfig().catch(() => ({ data: { data: null } }))
      ]);
      
      setAiConfig(aiResponse.data.data);
      setWebhookConfig(webhookResponse.data.data);
      
      // Set initial provider selection
      if (aiResponse.data.data?.provider) {
        setSelectedProvider(aiResponse.data.data.provider);
        setSelectedModel(aiResponse.data.data.config?.model || '');
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAISubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      setSaving(true);
      const provider = formData.get('provider');
      const aiData = {
        provider,
        model: selectedModel || formData.get('model') || undefined,
        maxTokens: parseInt(formData.get('maxTokens')) || undefined,
        temperature: parseFloat(formData.get('temperature')) || undefined
      };

      // Add API key for cloud providers
      if (provider === 'openai' || provider === 'google') {
        aiData.apiKey = formData.get('apiKey');
      }

      // Add base URL for local providers
      if (provider === 'ollama' || provider === 'lmstudio') {
        aiData.baseUrl = formData.get('baseUrl') || (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234');
      }

      await config.updateAIConfig(aiData);
      toast.success('AI configuration saved successfully');
      await fetchConfigs();
    } catch (error) {
      console.error('Failed to save AI config:', error);
      toast.error(error.response?.data?.error || 'Failed to save AI configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      setSaving(true);
      const webhookData = {
        url: formData.get('url'),
        secret: formData.get('secret'),
        events: {
          cardExtracted: formData.get('cardExtracted') === 'on',
          userAdded: formData.get('userAdded') === 'on',
          configChanged: formData.get('configChanged') === 'on'
        },
        retryConfig: {
          maxRetries: parseInt(formData.get('maxRetries')) || 3,
          retryDelay: parseInt(formData.get('retryDelay')) || 1000,
          backoffMultiplier: parseFloat(formData.get('backoffMultiplier')) || 2
        }
      };

      await config.updateWebhookConfig(webhookData);
      toast.success('Webhook configuration saved successfully');
      await fetchConfigs();
    } catch (error) {
      console.error('Failed to save webhook config:', error);
      toast.error(error.response?.data?.error || 'Failed to save webhook configuration');
    } finally {
      setSaving(false);
    }
  };

  const testAIConnection = async () => {
    try {
      setTesting(true);
      const response = await config.testAIConfig();
      toast.success(response.data.message);
    } catch (error) {
      console.error('AI test failed:', error);
      toast.error(error.response?.data?.error || 'AI test failed');
    } finally {
      setTesting(false);
    }
  };

  const testConnectionWithForm = async (formRef) => {
    try {
      setTesting(true);
      const formData = new FormData(formRef.current);
      
      const provider = formData.get('provider');
      const testData = {
        provider,
        model: formData.get('model') || undefined
      };

      // Add API key for cloud providers
      if (provider === 'openai' || provider === 'google') {
        testData.apiKey = formData.get('apiKey');
        if (!testData.apiKey) {
          toast.error('API key is required for cloud providers');
          return;
        }
      }

      // Add base URL for local providers
      if (provider === 'ollama' || provider === 'lmstudio') {
        testData.baseUrl = formData.get('baseUrl') || (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234');
      }

      const response = await config.testConnection(testData);
      
      if (response.data.success) {
        let message = response.data.message;
        if (response.data.availableModels && response.data.availableModels.length > 0) {
          message += `\n\nAvailable models: ${response.data.availableModels.slice(0, 5).join(', ')}${response.data.availableModels.length > 5 ? '...' : ''}`;
        }
        toast.success(message);
      } else {
        toast.error(response.data.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      let errorMessage = 'Connection test failed';
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused. Make sure the AI service is running.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const fetchAvailableModels = async (provider, baseUrl, apiKey) => {
    try {
      setLoadingModels(true);
      setAvailableModels([]);

      const requestData = { provider };

      // Add API key for cloud providers
      if (provider === 'openai' || provider === 'google') {
        if (!apiKey) {
          toast.error(`API key is required for ${provider}`);
          return;
        }
        requestData.apiKey = apiKey;
      }

      // Add base URL for local providers
      if (provider === 'ollama' || provider === 'lmstudio') {
        requestData.baseUrl = baseUrl || (provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234');
      }

      const response = await config.getAvailableModels(requestData);
      
      if (response.data.success) {
        // Ensure models is always an array and contains valid objects
        const models = Array.isArray(response.data.models) ? response.data.models : [];
        const validModels = models.filter(model => 
          model && typeof model === 'object' && (model.id || model.name)
        );
        
        setAvailableModels(validModels);
        
        // If no model is selected and models are available, select the first one
        if (!selectedModel && validModels.length > 0 && validModels[0]) {
          const firstModel = validModels[0];
          setSelectedModel(firstModel.id || firstModel.name || '');
        }
        
        if (validModels.length === 0) {
          toast.info(`No vision-capable models found for ${provider}`);
        } else {
          toast.success(`Found ${validModels.length} models for ${provider}`);
        }
      } else {
        setAvailableModels([]);
        toast.error(response.data.message || 'Failed to fetch available models');
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([]);
      let errorMessage = 'Failed to fetch models';
      
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message?.includes('ECONNREFUSED')) {
        errorMessage = `Cannot connect to ${provider}. Make sure it's running.`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoadingModels(false);
    }
  };

  const testCurrentAIConnection = async () => {
    try {
      setTesting(true);
      const response = await config.testAIConfig();
      toast.success(response.data.message);
    } catch (error) {
      console.error('AI test failed:', error);
      toast.error(error.response?.data?.error || 'AI connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const testWebhook = async () => {
    try {
      setTesting(true);
      const response = await config.testWebhook();
      toast.success('Webhook test successful');
    } catch (error) {
      console.error('Webhook test failed:', error);
      toast.error(error.response?.data?.error || 'Webhook test failed');
    } finally {
      setTesting(false);
    }
  };

  const tabs = [
    { id: 'ai', name: 'AI Configuration', icon: Bot },
    { id: 'webhook', name: 'Webhook Settings', icon: Webhook }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure AI providers and webhook settings</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* AI Configuration Tab */}
        {activeTab === 'ai' && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">AI Provider Configuration</h3>
                {aiConfig && (
                  <button
                    onClick={testAIConnection}
                    disabled={testing}
                    className="btn-secondary text-sm"
                  >
                    {testing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <div className="card-body">
              <form ref={aiFormRef} onSubmit={handleAISubmit} className="space-y-6">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Provider
                  </label>
                  <select
                    name="provider"
                    value={selectedProvider}
                    className="input"
                    required
                    onChange={(e) => {
                      const provider = e.target.value;
                      setSelectedProvider(provider);
                      setSelectedModel('');
                      setAvailableModels([]);
                      
                      // Don't auto-fetch for cloud providers as we need API key first
                      // Models will be fetched when API key is entered or "Fetch Models" is clicked
                    }}
                  >
                    <option value="openai">OpenAI (GPT-4 Vision)</option>
                    <option value="google">Google AI Studio (Gemini Pro Vision)</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="lmstudio">LM Studio (Local)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose between cloud AI services or local AI models
                  </p>
                </div>

                {/* API Key - Only for cloud providers */}
                {(!selectedProvider || selectedProvider === 'openai' || selectedProvider === 'google') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Key
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        name="apiKey"
                        placeholder={aiConfig ? 'Enter new API key to update' : 'Enter your API key'}
                        className="input pr-10"
                        required={!aiConfig}
                        onBlur={(e) => {
                          // Auto-fetch models when API key is entered for cloud providers
                          if ((selectedProvider === 'openai' || selectedProvider === 'google') && e.target.value) {
                            fetchAvailableModels(selectedProvider, '', e.target.value);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Your API key is encrypted and stored securely
                    </p>
                  </div>
                )}

                {/* Base URL - Only for local providers */}
                {(selectedProvider === 'ollama' || selectedProvider === 'lmstudio') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base URL
                    </label>
                    <input
                      type="url"
                      name="baseUrl"
                      placeholder={selectedProvider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
                      defaultValue={aiConfig?.credentials?.baseUrl}
                      className="input"
                      onBlur={(e) => {
                        // Fetch models when base URL changes
                        if (selectedProvider === 'ollama' || selectedProvider === 'lmstudio') {
                          fetchAvailableModels(selectedProvider, e.target.value);
                        }
                      }}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedProvider === 'ollama' 
                        ? 'Default Ollama API endpoint. Make sure Ollama is running on this address.'
                        : 'Default LM Studio API endpoint. Make sure LM Studio server is running on this address.'
                      }
                    </p>
                  </div>
                )}

                {/* Advanced Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                      {loadingModels && <span className="ml-2 text-blue-600">(Loading...)</span>}
                    </label>
                    
                    {/* Dropdown when models are available */}
                    {availableModels.length > 0 ? (
                      <select
                        name="model"
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="input"
                        required
                      >
                        <option value="">Select a model...</option>
                        {Array.isArray(availableModels) && availableModels.map((model) => {
                          if (!model || typeof model !== 'object') return null;
                          return (
                            <option key={model.id || model.name || Math.random()} value={model.id || model.name || ''}>
                              {String(model.name || model.id || 'Unknown Model')}
                              {model.size && typeof model.size === 'number' && ` (${Math.round(model.size / 1024 / 1024 / 1024 * 10) / 10}GB)`}
                              {model.description && typeof model.description === 'string' && ` - ${model.description.substring(0, 50)}...`}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      /* Text input fallback when no models available */
                      <input
                        type="text"
                        name="model"
                        placeholder={
                          selectedProvider === 'openai' ? 'gpt-4-vision-preview' :
                          selectedProvider === 'google' ? 'gemini-pro-vision' :
                          selectedProvider === 'ollama' ? 'llava:latest' :
                          selectedProvider === 'lmstudio' ? 'llava-v1.6-vicuna-7b' :
                          'gpt-4-vision-preview'
                        }
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="input"
                        required
                      />
                    )}
                    
                    {/* Fetch Models button for all providers */}
                    <button
                      type="button"
                      onClick={() => {
                        const form = aiFormRef.current;
                        let apiKey = '';
                        let baseUrl = '';
                        
                        // Get API key for cloud providers
                        if (selectedProvider === 'openai' || selectedProvider === 'google') {
                          const apiKeyInput = form?.querySelector('input[name="apiKey"]');
                          apiKey = apiKeyInput?.value;
                        }
                        
                        // Get base URL for local providers
                        if (selectedProvider === 'ollama' || selectedProvider === 'lmstudio') {
                          const baseUrlInput = form?.querySelector('input[name="baseUrl"]');
                          baseUrl = baseUrlInput?.value;
                        }
                        
                        fetchAvailableModels(selectedProvider, baseUrl, apiKey);
                      }}
                      disabled={loadingModels}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {loadingModels ? 'Loading...' : '🔄 Fetch Models'}
                    </button>
                    
                    {/* Provider-specific guidance */}
                    {!loadingModels && availableModels.length === 0 && (
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedProvider === 'openai' && 'Enter your OpenAI API key and click "Fetch Models" to see available vision models.'}
                        {selectedProvider === 'google' && 'Enter your Google AI Studio API key and click "Fetch Models" to see available models.'}
                        {selectedProvider === 'ollama' && 'Make sure Ollama is running and has vision models installed (e.g., llava:latest).'}
                        {selectedProvider === 'lmstudio' && 'Make sure LM Studio server is running with vision models loaded.'}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      name="maxTokens"
                      min="100"
                      max="4000"
                      defaultValue={aiConfig?.config?.maxTokens || 1000}
                      className="input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature
                    </label>
                    <input
                      type="number"
                      name="temperature"
                      min="0"
                      max="2"
                      step="0.1"
                      defaultValue={aiConfig?.config?.temperature || 0.1}
                      className="input"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => testConnectionWithForm(aiFormRef)}
                    disabled={testing || saving}
                    className="btn-secondary"
                  >
                    {testing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={saving || testing}
                    className="btn-primary"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Current Status */}
              {aiConfig && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      AI Provider: {aiConfig.provider} • Model: {aiConfig.config?.model}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    Last used: {aiConfig.lastUsed ? new Date(aiConfig.lastUsed).toLocaleString() : 'Never'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Webhook Configuration Tab */}
        {activeTab === 'webhook' && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Webhook Configuration</h3>
                {webhookConfig && (
                  <button
                    onClick={testWebhook}
                    disabled={testing}
                    className="btn-secondary text-sm"
                  >
                    {testing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Webhook
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <div className="card-body">
              <form onSubmit={handleWebhookSubmit} className="space-y-6">
                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    placeholder="https://your-app.com/webhook"
                    defaultValue={webhookConfig?.url}
                    className="input"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Your endpoint will receive POST requests with extracted card data
                  </p>
                </div>

                {/* Webhook Secret */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      name="secret"
                      placeholder={webhookConfig ? 'Enter new secret to update' : 'Enter a secret for HMAC signing'}
                      className="input pr-10"
                      minLength="16"
                      required={!webhookConfig}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showSecret ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Used to sign requests with HMAC SHA-256. Minimum 16 characters.
                  </p>
                </div>

                {/* Event Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Events to Send
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="cardExtracted"
                        defaultChecked={webhookConfig?.events?.cardExtracted !== false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Card Extracted - When a business card is processed
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="userAdded"
                        defaultChecked={webhookConfig?.events?.userAdded || false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        User Added - When a new user joins the organization
                      </span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="configChanged"
                        defaultChecked={webhookConfig?.events?.configChanged || false}
                        className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Config Changed - When settings are updated
                      </span>
                    </label>
                  </div>
                </div>

                {/* Retry Configuration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Retry Configuration
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Max Retries
                      </label>
                      <input
                        type="number"
                        name="maxRetries"
                        min="0"
                        max="10"
                        defaultValue={webhookConfig?.retryConfig?.maxRetries || 3}
                        className="input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Initial Delay (ms)
                      </label>
                      <input
                        type="number"
                        name="retryDelay"
                        min="100"
                        defaultValue={webhookConfig?.retryConfig?.retryDelay || 1000}
                        className="input"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Backoff Multiplier
                      </label>
                      <input
                        type="number"
                        name="backoffMultiplier"
                        min="1"
                        step="0.1"
                        defaultValue={webhookConfig?.retryConfig?.backoffMultiplier || 2}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Current Status */}
              {webhookConfig && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      Webhook configured: {webhookConfig.url}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Total sent: {webhookConfig.stats?.totalSent || 0}</p>
                    <p>Success rate: {
                      webhookConfig.stats?.totalSent > 0 
                        ? Math.round((webhookConfig.stats?.successCount / webhookConfig.stats?.totalSent) * 100)
                        : 0
                    }%</p>
                    <p>Last triggered: {
                      webhookConfig.lastTriggered 
                        ? new Date(webhookConfig.lastTriggered).toLocaleString() 
                        : 'Never'
                    }</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminSettings;