# Open Hivemind Server

This document describes the server architecture that combines the bot services and webui into a single process.

## 🎯 Overview

The Open Hivemind Server runs a single process that provides:
- **Bot Services**: Discord, Slack, and other messenger platform integrations
- **WebUI**: Modern React-based dashboard for bot management
- **API**: RESTful API for bot configuration and monitoring
- **WebSocket**: Real-time communication between bot and webui
- **Webhooks**: External service integration endpoints

## 🚀 Quick Start

### Option 1: Build and Start (Production)
```bash
# Build everything and start production server
npm run start:unified

# Or manually:
npm run build
npm run start
```

### Option 2: Development Mode
```bash
# Start in development mode with hot reload
npm run start:dev

# Or use the convenience script:
./scripts/start-unified.sh
```

### Option 3: WebUI Only (No Bots)
```bash
# Start only the web interface, skip messenger initialization
SKIP_MESSENGERS=true npm run start:dev
```

## 📁 Architecture

### Single Process Design
```
┌─────────────────────────────────────┐
│        Open Hivemind Server         │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  │
│  │ Bot Services│  │  HTTP Server │  │
│  │             │  │              │  │
│  │ • Discord  │  │ • WebUI      │  │
│  │ • Slack     │  │ • API        │  │
│  │ • Webhooks  │  │ • WebSocket  │  │
│  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────┘
```

### Key Components

1. **Main Server** (`src/index.ts`)
   - Initializes all services
   - Starts HTTP server on configured port
   - Serves WebUI from built frontend assets
   - Manages bot lifecycle

2. **Frontend** (`src/client/`)
   - React application built with Vite
   - Served from `/` route
   - Communicates with backend via API and WebSocket

3. **API Routes**
   - `/api/*` - RESTful API endpoints
   - `/webui/*` - WebUI-specific endpoints
   - `/webui/socket.io` - WebSocket endpoint

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3028` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |
| `HTTP_ENABLED` | `true` | Enable/disable HTTP server |
| `SKIP_MESSENGERS` | `false` | Skip bot initialization |
| `MESSAGE_PROVIDER` | `slack` | Default messenger platform |

### Usage Examples

```bash
# Run on custom port
PORT=8080 npm run start

# Development with webui only
SKIP_MESSENGERS=true npm run start:dev

# Production with custom environment
NODE_ENV=production PORT=3000 npm run start
```

## 🔧 Development Workflow

### 1. Development Mode
```bash
# Start with live reload
npm run start:dev

# In another terminal, frontend dev server
npm run dev:frontend
```

### 2. Build Process
```bash
# Build both backend and frontend
npm run build

# Build backend only
npm run build:server

# Build frontend only
npm run build:frontend
```

### 3. Testing
```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Run Playwright tests
npm run test:playwright
```

## 🌐 Access Points

When the server starts, it provides:

- **WebUI**: `http://localhost:3028`
- **API Base**: `http://localhost:3028/api`
- **WebSocket**: `ws://localhost:3028/webui/socket.io`
- **Health Check**: `http://localhost:3028/health`

## 📊 Monitoring

The server provides detailed startup logging:

```
🚀 Starting Open Hivemind Server
🔧 Configuration { nodeEnv: "development", httpEnabled: true, skipMessengers: false, port: "3028" }
🤖 Resolved LLM providers { providers: ["OpenAIProvider"] }
📡 Initializing messenger services
📡 Message providers configured { providers: ["slack"] }
🤖 Starting messenger bots { services: "slack" }
✅ Bot started { provider: "slack" }
🌐 Starting HTTP server { port: 3028, host: "0.0.0.0" }
✅ HTTP server listening { port: 3028 }
🔌 WebSocket service ready { endpoint: "/webui/socket.io" }
🌍 WebUI available { url: "http://localhost:3028" }
📡 API endpoints available { baseUrl: "http://localhost:3028/api" }
📱 Frontend assets served from { path: "dist/client/dist" }
🪝 Webhook service is disabled
🎉 Open Hivemind Server startup complete!
```

## 🔄 Process Management

### Start Options

1. **Full Service**: All bots + webui + api
   ```bash
   npm run start
   ```

2. **WebUI Only**: Just the web interface
   ```bash
   SKIP_MESSENGERS=true npm run start
   ```

3. **Development**: With hot reload
   ```bash
   npm run start:dev
   ```

### Graceful Shutdown

The server handles:
- `SIGINT` (Ctrl+C) - Graceful shutdown
- `SIGTERM` - Graceful shutdown
- Uncaught exceptions - Clean exit

## 🐳 Docker Deployment

The server works great with Docker:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3028
CMD ["npm", "start"]
```

## 🛠️ Troubleshooting

### Frontend Not Found
If you see "Frontend not found" warnings:
```bash
npm run build:frontend
```

### Port Already in Use
Change the port:
```bash
PORT=8080 npm run start
```

### Bot Connection Issues
Check your bot tokens and configuration in `.env` file.

## 📝 Migration from Multi-Process

If you were previously running separate processes for bots and webui:

1. **Remove old startup scripts** - No longer needed
2. **Update deployment configs** - Use single process
3. **Combine environment variables** - All in one `.env`
4. **Update health checks** - Single endpoint now

## 🚀 Performance

The server provides:
- **Lower memory usage** than multiple processes
- **Faster startup** time
- **Simplified deployment**
- **Better resource utilization**
- **Easier debugging and monitoring**

## 📚 API Documentation

See the `/api/docs` endpoint (when available) or check the source code in `src/server/routes/` for detailed API documentation.