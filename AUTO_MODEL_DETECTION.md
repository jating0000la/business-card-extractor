# Auto Model Detection Feature

## Overview
The Business Card Data Extractor now includes automatic model detection for Ollama and LM Studio, making it much easier to configure local AI providers.

## How It Works

### 🔄 Automatic Model Discovery
When you select **Ollama** or **LM Studio** as your AI provider, the system automatically:
1. **Fetches Available Models**: Connects to your local AI service and retrieves the list of installed models
2. **Populates Dropdown**: Shows models in a dropdown with additional information (size, type, etc.)
3. **Auto-Selection**: If no model is currently selected, automatically selects the first available model
4. **Real-time Updates**: Refreshes the model list when you change the base URL or click "Refresh Models"

### 🎯 Smart UI Adaptation

#### For Cloud Providers (OpenAI, Google AI):
- **Text Input**: Shows a traditional text input field for entering model names
- **Predefined Placeholders**: Suggests common models like `gpt-4-vision-preview` or `gemini-pro-vision`

#### For Local Providers (Ollama, LM Studio):
- **Dynamic Dropdown**: Automatically populated with available models from your local service
- **Model Information**: Shows model size and other metadata where available
- **Refresh Button**: Allows you to reload the model list without changing providers
- **Fallback Input**: Falls back to text input if no models are detected

## User Interface Features

### 📋 Model Dropdown
```
┌─ Model ─────────────────────────────────────┐
├─ Select a model...                          │
├─ llava:latest                               │
├─ llava:13b (7.2GB)                          │
├─ bakllava:latest (4.1GB)                    │
└─ llava-v1.6-34b (19.8GB)                    │
```

### 🔄 Loading States
- **"Model (Loading...)"** - Shows while fetching models
- **Disabled controls** - Prevents interactions during loading
- **Loading spinner** - Visual feedback for long operations

### ⚠️ Error Handling
- **Connection Errors**: Clear messages when AI service isn't running
- **No Models Found**: Helpful guidance when no models are available
- **Network Issues**: Graceful fallback to manual input

## API Endpoints

### New Endpoint: `/api/config/ai/models`
```json
POST /api/config/ai/models
{
  "provider": "ollama|lmstudio",
  "baseUrl": "http://localhost:11434" // optional
}

Response:
{
  "success": true,
  "models": [
    {
      "id": "llava:latest",
      "name": "llava:latest",
      "size": 4368000000,
      "modified": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Configuration Workflow

### Step-by-Step Process:

1. **Select Provider**
   ```
   AI Provider: [Ollama (Local) ▼]
   ```

2. **Configure Base URL** (Optional)
   ```
   Base URL: [http://localhost:11434        ]
   ```

3. **Auto-Fetch Models**
   - System automatically fetches available models
   - Shows loading indicator during fetch

4. **Select Model**
   ```
   Model: [llava:latest ▼] 🔄 Refresh Models
   ```

5. **Test & Save**
   - Use "Test Connection" to verify setup
   - Save configuration when ready

## Technical Implementation

### Backend Changes
- **New API Route**: `/api/config/ai/models` for model discovery
- **Enhanced AI Service**: `getAvailableModels()` method for Ollama/LM Studio
- **Model Metadata**: Returns model size, creation date, and other info

### Frontend Changes  
- **Dynamic Form Fields**: Conditional rendering based on provider selection
- **State Management**: Tracks selected provider, available models, loading states
- **Auto-Refresh**: Fetches models when provider or base URL changes
- **Error Handling**: Graceful fallback and clear error messages

### Provider-Specific Logic

#### Ollama Integration
```javascript
// API Call: GET http://localhost:11434/api/tags
// Response includes: name, size, modified_at, digest, details
```

#### LM Studio Integration  
```javascript
// API Call: GET http://localhost:1234/v1/models
// Response includes: id, object, created, owned_by
```

## Benefits

### 🚀 **Improved User Experience**
- **No Manual Typing**: Select models from dropdown instead of typing names
- **Visual Feedback**: See model sizes and metadata at a glance  
- **Error Prevention**: Reduces typos and invalid model names
- **Real-time Validation**: Immediate feedback if models aren't available

### 🔧 **Better Reliability**
- **Auto-Discovery**: Always shows currently available models
- **Live Updates**: Refreshes when you install/remove models
- **Connection Testing**: Verifies service is running before showing models
- **Graceful Fallback**: Falls back to text input if auto-detection fails

### 📊 **Enhanced Information**
- **Model Sizes**: Helps users choose based on their hardware capabilities
- **Model Status**: Shows which models are currently loaded/available
- **Resource Planning**: Better understanding of system requirements

## Troubleshooting

### Common Issues & Solutions

**"No models found"**
- ✅ Make sure Ollama/LM Studio is running
- ✅ Verify the base URL is correct
- ✅ Check that models are installed (`ollama list` for Ollama)

**"Failed to fetch models"**  
- ✅ Check if the AI service is accessible at the specified URL
- ✅ Verify firewall settings aren't blocking the connection
- ✅ Try the "Refresh Models" button

**"Loading..." never stops**
- ✅ Check network connectivity to the local AI service
- ✅ Restart the AI service if it appears hung
- ✅ Verify the service is responding to API calls

### Manual Verification
You can test the API endpoints directly:

```bash
# Test Ollama
curl http://localhost:11434/api/tags

# Test LM Studio  
curl http://localhost:1234/v1/models
```

## Future Enhancements

### Planned Features
- **Model Performance Metrics**: Show processing speed and accuracy ratings
- **Auto-Installation**: Direct integration to pull/download new models
- **Model Recommendations**: Suggest optimal models based on hardware
- **Batch Operations**: Configure multiple models simultaneously
- **Health Monitoring**: Real-time status of local AI services

---

This auto-pickup functionality makes local AI configuration as easy as cloud AI setup, while providing better visibility into your available resources and capabilities! 🎉