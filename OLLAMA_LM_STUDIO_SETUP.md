# Ollama and LM Studio Integration Guide

This guide will help you set up and use local AI models with Ollama or LM Studio for business card data extraction.

## Table of Contents
- [Ollama Setup](#ollama-setup)
- [LM Studio Setup](#lm-studio-setup)
- [Configuration in Business Card Extractor](#configuration-in-business-card-extractor)
- [Recommended Models](#recommended-models)
- [Troubleshooting](#troubleshooting)
- [Performance Considerations](#performance-considerations)

## Ollama Setup

### 1. Install Ollama

**Windows:**
1. Download Ollama from [https://ollama.ai/](https://ollama.ai/)
2. Run the installer and follow the setup wizard
3. Open Command Prompt or PowerShell

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Install Vision Models

Ollama supports several vision models for image analysis. For business card extraction, we recommend:

```bash
# Install LLaVA (recommended for business cards)
ollama pull llava:latest

# Alternative models
ollama pull llava:13b
ollama pull llava:7b
ollama pull bakllava:latest
```

### 3. Start Ollama Service

```bash
# Start Ollama server (default port: 11434)
ollama serve
```

### 4. Verify Installation

```bash
# List installed models
ollama list

# Test a model
ollama run llava:latest
```

## LM Studio Setup

### 1. Install LM Studio

1. Download LM Studio from [https://lmstudio.ai/](https://lmstudio.ai/)
2. Install the application for your operating system
3. Launch LM Studio

### 2. Download Vision Models

In LM Studio:
1. Go to the "Search" tab
2. Search for vision models (look for models with "vision" or "llava" in the name)
3. Recommended models:
   - `llava-v1.6-vicuna-7b-gguf`
   - `llava-v1.6-34b-gguf`
   - `bakllava-1-gguf`

### 3. Start Local Server

1. Go to the "Local Server" tab in LM Studio
2. Select your downloaded vision model
3. Configure server settings:
   - **Port:** 1234 (default)
   - **CORS:** Enable for web access
   - **API Key:** Leave empty for local use
4. Click "Start Server"

### 4. Verify Server

Open your browser and visit: `http://localhost:1234/v1/models`
You should see a JSON response with available models.

## Configuration in Business Card Extractor

### 1. Access Admin Settings

1. Log in to your Business Card Extractor application
2. Navigate to **Admin** → **Settings**
3. Go to the **AI Configuration** tab

### 2. Configure Ollama

1. **AI Provider:** Select "Ollama (Local)"
2. **Base URL:** `http://localhost:11434` (default)
3. **Model:** `llava:latest` (or your installed model)
4. **Max Tokens:** 1000-2000 (recommended)
5. **Temperature:** 0.1-0.3 (for consistent results)
6. Click **Test Connection** to verify
7. Click **Save Configuration**

### 3. Configure LM Studio

1. **AI Provider:** Select "LM Studio (Local)"
2. **Base URL:** `http://localhost:1234` (default)
3. **Model:** `llava-v1.6-vicuna-7b` (or your loaded model)
4. **Max Tokens:** 1000-2000 (recommended)
5. **Temperature:** 0.1-0.3 (for consistent results)
6. Click **Test Connection** to verify
7. Click **Save Configuration**

## Recommended Models

### For Ollama

| Model | Size | Quality | Speed | Best For |
|-------|------|---------|-------|----------|
| `llava:7b` | ~4GB | Good | Fast | Quick processing |
| `llava:13b` | ~8GB | Better | Medium | Balanced quality/speed |
| `llava:latest` | ~7GB | Good | Fast | General use |
| `bakllava:latest` | ~4GB | Good | Fast | Alternative option |

### For LM Studio

| Model | Size | Quality | Speed | Requirements |
|-------|------|---------|-------|--------------|
| `llava-v1.6-vicuna-7b` | ~4GB | Good | Fast | 8GB RAM |
| `llava-v1.6-34b` | ~20GB | Excellent | Slow | 32GB RAM |
| `bakllava-1` | ~4GB | Good | Fast | 8GB RAM |

## Troubleshooting

### Common Issues

**1. Connection Failed**
- Ensure Ollama/LM Studio is running
- Check if the port is accessible: `curl http://localhost:11434/api/tags` (Ollama) or `curl http://localhost:1234/v1/models` (LM Studio)
- Verify firewall settings

**2. Model Not Found**
```bash
# For Ollama - list installed models
ollama list

# Pull missing model
ollama pull llava:latest
```

**3. Slow Processing**
- Use smaller models (7B instead of 13B or 34B)
- Increase system RAM
- Close other applications
- Use GPU acceleration if available

**4. Poor Extraction Quality**
- Try different models
- Adjust temperature (0.1-0.3 for consistency)
- Ensure business card images are clear and well-lit
- Check if model supports vision tasks

### Error Messages

**"Connection refused"**
- Start the AI service: `ollama serve` or start LM Studio server
- Check if port is already in use

**"Model not found"**
- Install the model: `ollama pull llava:latest`
- For LM Studio: Download model in the application

**"Out of memory"**
- Use smaller models
- Increase system RAM
- Close other applications

## Performance Considerations

### System Requirements

**Minimum:**
- 8GB RAM
- 4GB free disk space
- CPU with 4+ cores

**Recommended:**
- 16GB+ RAM
- 8GB+ free disk space
- GPU with 8GB+ VRAM (for faster processing)
- CPU with 8+ cores

### Optimization Tips

1. **Model Selection:**
   - Use 7B models for faster processing
   - Use 13B+ models for better accuracy

2. **Hardware:**
   - Enable GPU acceleration in Ollama/LM Studio
   - Increase RAM allocation if possible

3. **Configuration:**
   - Set temperature to 0.1-0.3 for consistent results
   - Limit max tokens to 1000-2000
   - Process images in batches during off-peak hours

### Comparison: Local vs Cloud

| Factor | Local (Ollama/LM Studio) | Cloud (OpenAI/Google) |
|--------|-------------------------|----------------------|
| **Cost** | Free after setup | Pay per request |
| **Privacy** | Complete privacy | Data sent to cloud |
| **Speed** | Depends on hardware | Generally faster |
| **Quality** | Model dependent | High quality |
| **Setup** | Complex initial setup | Simple API key |
| **Reliability** | Hardware dependent | High availability |

## Next Steps

1. **Test Different Models:** Try various models to find the best balance of speed and accuracy for your use case
2. **Monitor Performance:** Keep track of processing times and accuracy rates
3. **Optimize Settings:** Fine-tune temperature and token limits based on your results
4. **Scale Up:** Consider GPU acceleration or larger models for better performance

## Support

If you encounter issues:

1. Check the [Ollama Documentation](https://github.com/ollama/ollama)
2. Review [LM Studio Documentation](https://lmstudio.ai/docs)
3. Verify your system meets the requirements
4. Test with smaller models first
5. Check application logs for detailed error messages

## Security Considerations

When using local AI models:

- **Network Security:** Local models don't send data over the internet
- **Data Privacy:** All processing happens on your local machine
- **Access Control:** Ensure only authorized users can access the AI services
- **Updates:** Keep Ollama/LM Studio updated for security patches

---

**Note:** Local AI models provide complete privacy and cost control but require adequate hardware resources. Start with smaller models to test your setup before moving to larger, more resource-intensive models.