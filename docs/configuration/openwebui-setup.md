# OpenWebUI Setup Guide

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Provider Cheat Sheet](provider-cheatsheet.md)

---

## Overview

OpenWebUI (formerly OllamaWebUI) is a user-friendly web interface for running large language models locally. Open-Hivemind integrates with OpenWebUI to leverage local LLMs for AI-powered responses.

## Prerequisites

- **OpenWebUI Instance**: A running OpenWebUI server
- **Local LLM**: Ollama or other supported LLM running locally or on your network
- **Network Access**: OpenWebUI must be accessible from the Open-Hivemind server

## Quick Setup

### Step 1: Start OpenWebUI

```bash
# Using Docker (recommended)
docker run -d -p 8080:8080 --add-host=host.docker.internal:host-gateway -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:main

# Or using pip
pip install open-webui
open-webui serve
```

### Step 2: Configure Ollama (if using local models)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama2
ollama pull mistral

# Start Ollama
ollama serve
```

### Step 3: Configure Open-Hivemind

#### Option A: Environment Variables

```bash
# Required
LLM_PROVIDER=openwebui
OPENWEBUI_BASE_URL=http://localhost:8080

# Optional - for authenticated instances
OPENWEBUI_API_KEY=your-api-key

# Model selection (if not using default)
OPENWEBUI_MODEL=llama2
```

#### Option B: WebUI Configuration

1. Navigate to **Bots** → **Create/Edit Bot**
2. Select **OpenWebUI** as the LLM Provider
3. Enter the OpenWebUI Base URL
4. (Optional) Enter API Key if authentication is enabled
5. (Optional) Specify model name

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENWEBUI_BASE_URL` | Yes | - | Base URL of your OpenWebUI instance |
| `OPENWEBUI_API_KEY` | No | - | API key for authentication |
| `OPENWEBUI_MODEL` | No | (server default) | Model to use for completions |
| `OPENWEBUI_TIMEOUT` | No | `60000` | Request timeout in milliseconds |

## Connecting to OpenWebUI

### Local Installation

```bash
# Default local setup
OPENWEBUI_BASE_URL=http://localhost:8080
```

### Docker Network

```bash
# If running in Docker Compose
OPENWEBUI_BASE_URL=http://openwebui:8080
```

### Remote Server

```bash
# Remote OpenWebUI instance
OPENWEBUI_BASE_URL=https://openwebui.yourdomain.com
OPENWEBUI_API_KEY=your-secure-api-key
```

### With Ollama on Different Host

```bash
# Ollama on remote machine
OPENWEBUI_BASE_URL=http://ollama-server:8080
# Ensure Ollama is configured to accept connections:
# O0.0.LLAMA_HOST=0.0
```

## Authentication Setup

### Enabling API Key Authentication

1. Log in to OpenWebUI as admin
2. Go to **Settings** → **Admin Panel** → **Security**
3. Enable **API Key Authentication**
4. Generate and copy your API key

### Using the API Key

```bash
OPENWEBUI_BASE_URL=http://localhost:8080
OPENWEBUI_API_KEY=sk-your-key-here
```

## Model Management

### Available Models

After starting OpenWebUI with Ollama, models are available automatically:

```bash
# List available models via API
curl http://localhost:8080/api/models -H "Authorization: Bearer sk-your-key"
```

### Selecting Models

#### Via Environment Variable

```bash
OPENWEBUI_MODEL=llama2
OPENWEBUI_MODEL=mistral
OPENWEBUI_MODEL=codellama
```

#### Via Metadata (Per-Request)

Set in your bot configuration or persona:
```
System: Use the codellama model for code-related queries
```

## Troubleshooting

### Error: "Connection refused"

**Cause**: OpenWebUI is not running or not accessible.

**Solution**:
1. Verify OpenWebUI is running: `curl http://localhost:8080`
2. Check Docker container status: `docker ps | grep open-webui`
3. Check firewall rules for port 8080

### Error: "401 Unauthorized"

**Cause**: Missing or invalid API key.

**Solution**:
1. Verify API key is correct
2. Check if API key authentication is enabled in OpenWebUI
3. Ensure `OPENWEBUI_API_KEY` is set in environment

### Error: "Model not found"

**Cause**: Requested model is not available.

**Solution**:
1. List available models: `ollama list`
2. Pull the model: `ollama pull <model-name>`
3. Update `OPENWEBUI_MODEL` to match available models

### Error: "Timeout"

**Cause**: Model is taking too long to respond.

**Solution**:
1. Increase timeout: `OPENWEBUI_TIMEOUT=120000`
2. Use a smaller/faster model
3. Check system resources (RAM, GPU)
4. Check Ollama logs for loading issues

### Error: "Context length exceeded"

**Cause**: Message history exceeds model's context window.

**Solution**:
1. Reduce `MESSAGE_HISTORY_MAX_MESSAGES` in config
2. Use a model with larger context (e.g., llama2:70b)
3. Implement message summarization

## Advanced Configuration

### Multiple Models

Configure different bots to use different models:
```bash
# Bot 1 - General purpose
BOTS_bot1_LLM_PROVIDER=openwebui
BOTS_bot1_OPENWEBUI_MODEL=llama2

# Bot 2 - Code-focused
BOTS_bot2_LLM_PROVIDER=openwebui
BOTS_bot2_OPENWEBUI_MODEL=codellama
```

### Streaming Responses

OpenWebUI supports streaming for real-time output:

```bash
# Enable streaming (enabled by default)
OPENWEBUI_ENABLE_STREAMING=true
```

### Custom Ollama Settings

Configure Ollama for better performance:
```bash
# In Ollama environment
OLLAMA_NUM_PARALLEL=4
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_FLASH_ATTENTION=1
```

## Performance Optimization

### Hardware Requirements

| Model Size | RAM | GPU |
|------------|-----|-----|
| 7B | 8GB | Optional |
| 13B | 16GB | Recommended |
| 34B | 32GB | Recommended |
| 70B | 64GB+ | Required |

### Tips for Better Performance

1. **Use GPU acceleration** - Ensure CUDA (NVIDIA) or Metal (Apple Silicon) is configured
2. **Load one model at a time** - Avoid loading multiple models simultaneously
3. **Use Quantized models** - Smaller models (Q4_0, Q5_1) are faster
4. **Increase timeout** - Local models may take time to load first request

### Docker Resource Allocation

```yaml
# docker-compose.yml
services:
  open-webui:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Security Considerations

1. **Network**: Use reverse proxy with HTTPS for remote access
2. **API Keys**: Rotate keys periodically
3. **Authentication**: Enable OpenWebUI authentication in production
4. **Firewall**: Restrict access to trusted IPs

## Migration from Ollama Direct

If you were using direct Ollama integration:

```bash
# Before (direct Ollama)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434

# After (OpenWebUI)
LLM_PROVIDER=openwebui
OPENWEBUI_BASE_URL=http://localhost:8080
```

OpenWebUI provides additional features like:
- Web UI for model management
- API key authentication
- Better error handling
- Built-in chat history
