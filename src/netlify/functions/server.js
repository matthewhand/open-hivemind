"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
var cors_1 = __importDefault(require("cors"));
var express_1 = __importDefault(require("express"));
var serverless_http_1 = __importDefault(require("serverless-http"));
// Create Express app
var app = (0, express_1.default)();
// Set up middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
// API documentation
app.get('/api', function (req, res) {
    res.json({
        name: 'Hivemind WebUI API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            admin: '/api/admin',
            agents: '/api/agents',
            mcp: '/api/mcp',
            activity: '/api/activity',
            webui: '/api/webui',
            dashboard: '/api/dashboard',
            config: '/api/config',
        },
        documentation: '/api/docs',
    });
});
// API health check
app.get('/api/health', function (req, res) {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// API fallback - return 404 for unknown API routes
app.get('/api/*', function (req, res) {
    res.status(404).json({ error: 'API endpoint not found' });
});
// Root handler for the function itself (if accessed directly)
app.get('/', function (req, res) {
    res.json({ status: 'Open-Hivemind API Function Operational' });
});
// Export handler for Netlify Functions
exports.handler = (0, serverless_http_1.default)(app);
