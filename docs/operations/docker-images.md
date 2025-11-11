# Docker Images

Navigation: [Docs Index](../README.md) | [Dev Startup](dev-startup.md) | [Configuration Overview](../configuration/overview.md)


This project provides two Docker image variants optimized for different use cases:

## Image Variants

### Full Image (`latest` tag)
- **Tags**: `latest`, `{version}` (e.g., `1.0.0`)
- **Size**: ~500MB
- **Features**: Complete feature set with all integrations enabled
- **Best for**: Production deployments requiring full functionality

**Includes:**
- Python 3 + uv package manager (provides `uvx`)
- Node.js + npx (+ MCP CLI tools when published)
- FFmpeg for Discord voice processing
- All integration features enabled

**Pull command:**
```bash
docker pull matthewhand/open-hivemind:latest
```

### Slim Image (`slim` tag)
- **Tags**: `slim`, `{version}-slim` (e.g., `1.0.0-slim`)
- **Size**: ~150MB
- **Features**: Core functionality only
- **Best for**: Development, testing, resource-constrained environments

**Includes:**
- Node.js runtime only
- Core bot functionality
- Basic integrations (no voice processing)

**Excludes:**
- Python tools and uv
- MCP CLI tools (optional add-on)
- FFmpeg (no Discord voice)
- Additional runtime dependencies

**Pull command:**
```bash
docker pull matthewhand/open-hivemind:slim
```

## Feature Comparison

| Feature | Full Image | Slim Image |
|---------|------------|------------|
| Core Bot Functionality | ✅ | ✅ |
| Discord Integration | ✅ | ✅ (text only) |
| Discord Voice Processing | ✅ | ❌ |
| Slack Integration | ✅ | ✅ |
| Telegram Integration | ✅ | ✅ |
| Python MCP Servers | ✅ | ❌ |
| Node.js MCP Servers | ✅ | ❌ |
| Custom MCP CLI Tools | ✅* | ❌ |
| Advanced Audio Processing | ✅ | ❌ |
| Image Size | ~500MB | ~150MB |
| Memory Usage | ~256MB | ~128MB |

`*` The image attempts to install the MCP CLI when the package is published to npm and logs a warning if it is unavailable.

## Build Arguments

Both images support the same build arguments, but have different defaults:

### Full Image Defaults
```dockerfile
INCLUDE_PYTHON_TOOLS=true
INCLUDE_NODE_TOOLS=true
INCLUDE_FFMPEG=true
LOW_MEMORY_MODE=false
```

### Slim Image Defaults
```dockerfile
INCLUDE_PYTHON_TOOLS=false
INCLUDE_NODE_TOOLS=false
INCLUDE_FFMPEG=false
LOW_MEMORY_MODE=true
```

## Custom Builds

You can build custom variants with specific features:

```bash
# Build with only Python tools
docker build \
  --build-arg INCLUDE_PYTHON_TOOLS=true \
  --build-arg INCLUDE_NODE_TOOLS=false \
  --build-arg INCLUDE_FFMPEG=false \
  -t open-hivemind:python-only .

# Build with only FFmpeg for voice
docker build \
  --build-arg INCLUDE_PYTHON_TOOLS=false \
  --build-arg INCLUDE_NODE_TOOLS=false \
  --build-arg INCLUDE_FFMPEG=true \
  -t open-hivemind:voice-only .
```

## Runtime Configuration

### Environment Variables

Both images create a `.env.features` file showing which features are enabled:

```bash
# Inside container
cat .env.features
# INCLUDE_PYTHON_TOOLS=true
# INCLUDE_NODE_TOOLS=true
# INCLUDE_FFMPEG=true
# LOW_MEMORY_MODE=false
```

### Feature Detection

The application automatically detects available features:

```javascript
// Discord voice processing will check for FFmpeg
const ffmpegAvailable = await checkFfmpegAvailable();
if (!ffmpegAvailable) {
  throw new Error('Voice features require FFmpeg to be installed');
}

// MCP servers will check for required tools
const hasPythonTools = process.env.INCLUDE_PYTHON_TOOLS === 'true';
const hasNodeTools = process.env.INCLUDE_NODE_TOOLS === 'true';
```

## Deployment Recommendations

### Production Use
- Use the `latest` image for full functionality
- Recommended for deployments with Discord voice features
- Best for MCP server integrations requiring Python/Node.js

### Development/Testing
- Use the `slim` image for faster builds and testing
- Ideal for API testing and basic integration work
- Lower resource consumption for CI/CD pipelines

### Resource-Constrained Environments
- Use the `slim` image for edge deployments
- Suitable for IoT devices or low-memory servers
- Perfect for text-only bot deployments

#### Build-Time Memory Controls

When deploying to platforms with extremely small build containers (e.g., 512 MB Render plans), leverage the new environment variables exposed by the build scripts:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BUILD_MAX_OLD_SPACE_SIZE` | `2048` | Caps the Node.js heap (in MB) for both backend (`tsc`) and frontend builds. |
| `BUILD_FRONTEND_MAX_OLD_SPACE_SIZE` | Inherits `BUILD_MAX_OLD_SPACE_SIZE` | Override the heap limit only for the Vite frontend build. |
| `BUILD_POST_BUILD_SLEEP_SECONDS` | `3600` | Keeps the container alive after the backend build; set to `0` to disable the sleep entirely. |
| `SKIP_FRONTEND_BUILD` | `false` | Skip the Vite build entirely (also implied by `LOW_MEMORY_MODE=true`). |
| `FORCE_FRONTEND_BUILD` | `false` | Run the frontend build even when `LOW_MEMORY_MODE=true`. |

Example Render build command:

```bash
BUILD_MAX_OLD_SPACE_SIZE=384 BUILD_POST_BUILD_SLEEP_SECONDS=0 npm run build
```

These limits dramatically reduce build-time memory spikes and avoid repeated restarts on resource-constrained hosts.

## Migration

### From Full to Slim
If migrating from full to slim image, note that:

1. Discord voice features will be disabled
2. MCP servers requiring Python/Node.js will fail to start
3. Some integrations may have limited functionality

### From Slim to Full
No migration is required - the full image is a superset of features.

## Security Considerations

- The full image includes more system packages (Python, FFmpeg)
- The slim image has a smaller attack surface
- Both images use the same Node.js runtime version
- Regular security updates apply to both variants

## Support

- **Full Image**: Full feature support including voice and MCP integrations
- **Slim Image**: Core functionality support only
- **Custom Builds**: Limited support for custom feature combinations
