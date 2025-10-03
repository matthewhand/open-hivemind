# Open-Hivemind API Endpoint Audit

## Existing Real Endpoints (from src/index.ts)

### Core Routes (Already Working)
- `/dashboard/api/status` - BotConfigurationManager bot status, message counts, errors
- `/webui/api/health` - Health check with detailed metrics
- `/webui/api/health/detailed` - Extended health information  
- `/webui/api/health/metrics` - Performance metrics
- `/webui/api/bots` - Bot management endpoints
- `/webui/api/config` - Configuration management
- `/webui/api/validation` - Validation endpoints
- `/api/admin` - Admin interface
- `/api/swarm` - Swarm management

### Dashboard Router (/dashboard/)
- `GET /` - HTML dashboard view
- `GET /api/status` - Real bot status from BotConfigurationManager
  - Returns: { bots: [...], uptime: number }
  - Bot data: name, provider, llmProvider, status, connected, messageCount, errorCount

### Health Router (/webui/api/health)
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health
- `GET /health/metrics` - Performance metrics (CPU, memory, etc.)
- `GET /health/alerts` - System alerts
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/metrics/prometheus` - Prometheus metrics format

## Mock Endpoints I Added (DUPLICATES - Remove These)
❌ `/dashboard/api/status` - DUPLICATE! Use existing one
❌ `/webui/api/performance-metrics` - USE /webui/api/health/metrics instead
❌ `/webui/api/analytics` - CREATE NEW endpoint if needed

## Recommendations
1. **Remove duplicate /dashboard/api/status** from start-webui.js
2. **Use existing /webui/api/health/metrics** for performance data
3. **Create /webui/api/analytics** in proper dashboard router if needed
4. **Use real BotConfigurationManager data** instead of mock data

## Frontend API Connections Needed
- Status: `/dashboard/api/status` (already exists!)
- Metrics: `/webui/api/health/metrics` (already exists!)
- Analytics: Create `/dashboard/api/analytics` if needed