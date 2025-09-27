# Open-Hivemind Backend API Endpoint Audit

## Complete Endpoint Inventory

### Core API Routes
- `/dashboard/api/status` - GET - Bot status with message counts
- `/dashboard/` - GET - Dashboard HTML view

### WebUI API Routes (all under `/webui/`)
- `/webui/api/config` - Configuration management
- `/webui/api/bots` - Bot management endpoints  
- `/webui/api/bot-config` - Bot configuration endpoints
- `/webui/api/validation` - Validation endpoints
- `/webui/api/hot-reload` - Hot reload management
- `/webui/api/ci` - CI/CD endpoints
- `/webui/api/enterprise` - Enterprise features
- `/webui/api/secure-config` - Secure configuration
- `/webui/api/auth` - Authentication
- `/webui/api/admin` - Admin interface
- `/webui/api/openapi` - OpenAPI documentation

### Admin & Swarm Routes
- `/api/swarm` - Swarm management
- `/health` - Health check endpoints

### Static Routes
- `/` - Root dashboard (public/index.html)
- `/uber` - Unified dashboard SPA
- `/webui` - Legacy WebUI SPA  
- `/admin` - Admin interface SPA

## TDD Test Plan
1. **Happy Path Tests** - All endpoints with valid data
2. **Edge Case Tests** - Invalid inputs, missing data, auth failures
3. **Integration Tests** - Full request/response cycles
4. **Load Tests** - Performance under stress