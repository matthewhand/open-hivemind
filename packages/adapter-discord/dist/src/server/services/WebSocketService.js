"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const socket_io_1 = require("socket.io");
const BotConfigurationManager_1 = require("../../config/BotConfigurationManager");
const os_1 = __importDefault(require("os"));
const debug_1 = __importDefault(require("debug"));
const ApiMonitorService_1 = __importDefault(require("../../services/ApiMonitorService"));
const debug = (0, debug_1.default)('app:WebSocketService');
class WebSocketService {
    constructor() {
        this.io = null;
        this.metricsInterval = null;
        this.connectedClients = 0;
        // Real-time monitoring data
        this.messageFlow = [];
        this.performanceMetrics = [];
        this.alerts = [];
        this.messageRateHistory = [];
        this.errorRateHistory = [];
        // internal sampling state
        this.lastCpuUsage = process.cpuUsage();
        this.lastHrTime = process.hrtime.bigint();
        // per-bot stats
        this.botMessageCounts = new Map();
        this.botErrors = new Map();
        this.initializeMonitoringData();
        this.apiMonitorService = ApiMonitorService_1.default.getInstance();
        this.setupApiMonitoring();
    }
    initializeMonitoringData() {
        // Initialize with empty arrays and default metrics
        this.messageFlow = [];
        this.performanceMetrics = [];
        this.alerts = [];
        this.messageRateHistory = new Array(60).fill(0); // 60 data points for 5-minute history
        this.errorRateHistory = new Array(60).fill(0);
    }
    setupApiMonitoring() {
        // Listen for API monitoring events
        this.apiMonitorService.on('statusUpdate', (status) => {
            this.handleApiStatusUpdate(status);
        });
        this.apiMonitorService.on('healthCheckResult', (result) => {
            this.handleApiHealthCheckResult(result);
        });
        // Start monitoring all configured endpoints
        this.apiMonitorService.startAllMonitoring();
    }
    handleApiStatusUpdate(status) {
        debug(`API endpoint status update: ${status.name} - ${status.status}`);
        // Broadcast to connected clients
        if (this.io && this.connectedClients > 0) {
            this.io.emit('api_status_update', {
                endpoint: status,
                timestamp: new Date().toISOString(),
            });
        }
        // Create alert for status changes
        if (status.status === 'error' || status.status === 'offline') {
            this.recordAlert({
                level: status.status === 'error' ? 'error' : 'warning',
                title: `API Endpoint ${status.status.toUpperCase()}`,
                message: `${status.name} is ${status.status}: ${status.errorMessage || 'No response'}`,
                metadata: {
                    endpointId: status.id,
                    url: status.url,
                    responseTime: status.responseTime,
                    consecutiveFailures: status.consecutiveFailures,
                },
            });
        }
    }
    handleApiHealthCheckResult(result) {
        debug(`API health check result: ${result.endpointId} - ${result.success ? 'success' : 'failed'}`);
        // Broadcast health check results to connected clients
        if (this.io && this.connectedClients > 0) {
            this.io.emit('api_health_check_result', {
                result,
                timestamp: new Date().toISOString(),
            });
        }
    }
    static getInstance() {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }
    // Public methods for external components to report events
    recordMessageFlow(event) {
        const messageEvent = {
            ...event,
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
        };
        this.messageFlow.push(messageEvent);
        // Per-bot message count
        const key = event.botName || 'unknown';
        this.botMessageCounts.set(key, (this.botMessageCounts.get(key) || 0) + 1);
        // Keep only last 1000 messages
        if (this.messageFlow.length > 1000) {
            this.messageFlow = this.messageFlow.slice(-1000);
        }
        // Update message rate
        this.updateMessageRate();
        // Broadcast to connected clients
        if (this.io && this.connectedClients > 0) {
            this.io.emit('message_flow_update', messageEvent);
        }
    }
    recordAlert(alert) {
        const alertEvent = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
        };
        this.alerts.push(alertEvent);
        // Per-bot error tracking (cap at 20 per bot)
        const key = alertEvent.botName || 'unknown';
        const list = this.botErrors.get(key) || [];
        list.push(`${alertEvent.level}: ${alertEvent.title}`);
        if (list.length > 20) {
            list.shift();
        }
        this.botErrors.set(key, list);
        // Keep only last 500 alerts
        if (this.alerts.length > 500) {
            this.alerts = this.alerts.slice(-500);
        }
        // Update error rate if this is an error
        if (alert.level === 'error' || alert.level === 'critical') {
            this.updateErrorRate();
        }
        // Broadcast to connected clients
        if (this.io && this.connectedClients > 0) {
            this.io.emit('alert_update', alertEvent);
        }
    }
    getMessageFlow(limit = 100) {
        return this.messageFlow.slice(-limit);
    }
    getAlerts(limit = 50) {
        return this.alerts.slice(-limit);
    }
    getPerformanceMetrics(limit = 60) {
        return this.performanceMetrics.slice(-limit);
    }
    getMessageRateHistory() {
        return [...this.messageRateHistory];
    }
    getErrorRateHistory() {
        return [...this.errorRateHistory];
    }
    getBotStats(botName) {
        return {
            messageCount: this.botMessageCounts.get(botName) || 0,
            errors: [...(this.botErrors.get(botName) || [])],
        };
    }
    getAllBotStats() {
        const out = {};
        for (const [name, count] of this.botMessageCounts.entries()) {
            out[name] = { messageCount: count, errors: [...(this.botErrors.get(name) || [])] };
        }
        return out;
    }
    updateMessageRate() {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        const recentMessages = this.messageFlow.filter(event => new Date(event.timestamp) > oneMinuteAgo);
        const currentRate = recentMessages.length;
        this.messageRateHistory.push(currentRate);
        this.messageRateHistory.shift(); // Remove oldest
    }
    updateErrorRate() {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        const recentErrors = this.alerts.filter(alert => (alert.level === 'error' || alert.level === 'critical') &&
            new Date(alert.timestamp) > oneMinuteAgo);
        const currentRate = recentErrors.length;
        this.errorRateHistory.push(currentRate);
        this.errorRateHistory.shift(); // Remove oldest
    }
    initialize(server) {
        try {
            debug('Initializing WebSocket service...');
            if (!server) {
                debug('ERROR: HTTP server is required for WebSocket initialization');
                throw new Error('HTTP server is required for WebSocket initialization');
            }
            this.io = new socket_io_1.Server(server, {
                path: '/webui/socket.io',
                cors: {
                    origin: [
                        /^https?:\/\/localhost(:\d+)?/,
                        /^https?:\/\/127\.0\.0\.1(:\d+)?/,
                        /^https:\/\/.*\.netlify\.app$/,
                        /^https:\/\/.*\.netlify\.com$/,
                        /^https:\/\/.*\.fly\.dev$/,
                    ],
                    methods: ['GET', 'POST'],
                    credentials: true,
                    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'X-CSRF-Token'],
                },
            });
            this.setupEventHandlers();
            this.startMetricsCollection();
            debug('WebSocket service initialized successfully with CORS enabled');
        }
        catch (error) {
            debug('CRITICAL: Failed to initialize WebSocket service:', {
                error: error.message,
                stack: error.stack,
                serverProvided: !!server,
            });
            throw new Error(`WebSocket service initialization failed: ${error.message}`);
        }
    }
    /**
     * Sets up WebSocket event handlers for client connections
     * Handles connection, disconnection, and various client requests
     */
    setupEventHandlers() {
        if (!this.io) {
            return;
        }
        this.io.on('connection', (socket) => {
            this.connectedClients++;
            debug(`Client connected. Total clients: ${this.connectedClients}`);
            // Send initial data
            this.sendBotStatus(socket);
            this.sendSystemMetrics(socket);
            socket.on('request_bot_status', () => {
                this.sendBotStatus(socket);
            });
            socket.on('request_system_metrics', () => {
                this.sendSystemMetrics(socket);
            });
            socket.on('request_config_validation', () => {
                this.sendConfigValidation(socket);
            });
            socket.on('request_message_flow', () => {
                this.sendMessageFlow(socket);
            });
            socket.on('request_alerts', () => {
                this.sendAlerts(socket);
            });
            socket.on('request_performance_metrics', () => {
                this.sendPerformanceMetrics(socket);
            });
            socket.on('request_monitoring_dashboard', () => {
                this.sendMonitoringDashboard(socket);
            });
            socket.on('request_api_status', () => {
                this.sendApiStatus(socket);
            });
            socket.on('request_api_endpoints', () => {
                this.sendApiEndpoints(socket);
            });
            socket.on('disconnect', () => {
                this.connectedClients--;
                debug(`Client disconnected. Total clients: ${this.connectedClients}`);
                // Clean up event listeners to prevent memory leaks
                socket.removeAllListeners();
            });
        });
    }
    /**
     * Starts periodic metrics collection and broadcasting
     * Sends bot status and system metrics updates every 5 seconds to connected clients
     */
    startMetricsCollection() {
        // Send updates every 5 seconds to connected clients
        this.metricsInterval = setInterval(() => {
            if (this.connectedClients > 0) {
                this.broadcastBotStatus();
                this.broadcastSystemMetrics();
                this.broadcastMonitoringData();
            }
        }, 5000);
    }
    broadcastMonitoringData() {
        if (!this.io) {
            return;
        }
        // Broadcast message flow updates
        if (this.messageFlow.length > 0) {
            this.io.emit('message_flow_broadcast', {
                latest: this.messageFlow.slice(-5), // Last 5 messages
                total: this.messageFlow.length,
                timestamp: new Date().toISOString(),
            });
        }
        // Broadcast alert updates
        if (this.alerts.length > 0) {
            const recentAlerts = this.alerts.filter(alert => new Date(alert.timestamp) > new Date(Date.now() - 30000));
            if (recentAlerts.length > 0) {
                this.io.emit('alerts_broadcast', {
                    alerts: recentAlerts,
                    timestamp: new Date().toISOString(),
                });
            }
        }
        // Broadcast performance metrics
        this.io.emit('performance_metrics_broadcast', {
            current: {
                memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
                errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
                activeConnections: this.connectedClients,
            },
            timestamp: new Date().toISOString(),
        });
        // Broadcast compact per-bot stats (message counts and error counts)
        try {
            const statsObj = this.getAllBotStats();
            const stats = Object.entries(statsObj).map(([name, s]) => ({
                name,
                messageCount: s.messageCount,
                errorCount: s.errors.length,
            }));
            this.io.emit('bot_stats_broadcast', {
                stats,
                timestamp: new Date().toISOString(),
            });
        }
        catch (_a) { }
    }
    sendBotStatus(socket) {
        try {
            const manager = BotConfigurationManager_1.BotConfigurationManager.getInstance();
            const bots = manager.getAllBots();
            const status = bots.map(bot => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const hasProviderSecret = !!(((_a = bot.discord) === null || _a === void 0 ? void 0 : _a.token) ||
                    ((_b = bot.slack) === null || _b === void 0 ? void 0 : _b.botToken) ||
                    ((_c = bot.mattermost) === null || _c === void 0 ? void 0 : _c.token));
                const botStatus = hasProviderSecret ? 'active' : 'inactive';
                return {
                    name: bot.name,
                    provider: bot.messageProvider,
                    llmProvider: bot.llmProvider,
                    status: botStatus,
                    lastSeen: new Date().toISOString(),
                    capabilities: {
                        voiceSupport: !!((_d = bot.discord) === null || _d === void 0 ? void 0 : _d.voiceChannelId),
                        multiChannel: bot.messageProvider === 'slack' && !!((_e = bot.slack) === null || _e === void 0 ? void 0 : _e.joinChannels),
                        hasSecrets: !!(((_f = bot.discord) === null || _f === void 0 ? void 0 : _f.token) || ((_g = bot.slack) === null || _g === void 0 ? void 0 : _g.botToken) || ((_h = bot.openai) === null || _h === void 0 ? void 0 : _h.apiKey)),
                    },
                };
            });
            socket.emit('bot_status_update', {
                bots: status,
                timestamp: new Date().toISOString(),
                total: bots.length,
                active: bots.length,
            });
        }
        catch (error) {
            debug('Error sending bot status:', error);
            socket.emit('error', { message: 'Failed to get bot status' });
        }
    }
    sendSystemMetrics(socket) {
        try {
            const memUsage = process.memoryUsage();
            const metrics = {
                uptime: process.uptime(),
                memory: {
                    used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    external: Math.round(memUsage.external / 1024 / 1024), // MB
                    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                },
                cpu: {
                    usage: process.cpuUsage(),
                },
                connectedClients: this.connectedClients,
                timestamp: new Date().toISOString(),
            };
            socket.emit('system_metrics_update', metrics);
        }
        catch (error) {
            debug('Error sending system metrics:', error);
            socket.emit('error', { message: 'Failed to get system metrics' });
        }
    }
    sendConfigValidation(socket) {
        try {
            const manager = BotConfigurationManager_1.BotConfigurationManager.getInstance();
            const bots = manager.getAllBots();
            const warnings = manager.getWarnings();
            const validation = {
                isValid: warnings.length === 0,
                warnings,
                botCount: bots.length,
                missingConfigs: this.findMissingConfigurations(bots),
                recommendations: this.generateRecommendations(bots),
                timestamp: new Date().toISOString(),
            };
            socket.emit('config_validation_update', validation);
        }
        catch (error) {
            debug('Error sending config validation:', error);
            socket.emit('error', { message: 'Failed to validate configuration' });
        }
    }
    findMissingConfigurations(bots) {
        const missing = [];
        bots.forEach(bot => {
            var _a, _b, _c, _d;
            if (bot.messageProvider === 'discord' && !((_a = bot.discord) === null || _a === void 0 ? void 0 : _a.token)) {
                missing.push(`${bot.name}: Missing Discord bot token`);
            }
            if (bot.messageProvider === 'slack' && !((_b = bot.slack) === null || _b === void 0 ? void 0 : _b.botToken)) {
                missing.push(`${bot.name}: Missing Slack bot token`);
            }
            if (bot.llmProvider === 'openai' && !((_c = bot.openai) === null || _c === void 0 ? void 0 : _c.apiKey)) {
                missing.push(`${bot.name}: Missing OpenAI API key`);
            }
            if (bot.llmProvider === 'flowise' && !((_d = bot.flowise) === null || _d === void 0 ? void 0 : _d.apiKey)) {
                missing.push(`${bot.name}: Missing Flowise API key`);
            }
        });
        return missing;
    }
    generateRecommendations(bots) {
        const recommendations = [];
        if (bots.length === 0) {
            recommendations.push('No bots configured. Add at least one bot to get started.');
        }
        const providers = new Set(bots.map(b => b.messageProvider));
        if (providers.size === 1 && providers.has('discord')) {
            recommendations.push('Consider adding Slack integration for broader platform support.');
        }
        const llmProviders = new Set(bots.map(b => b.llmProvider));
        if (llmProviders.size === 1) {
            recommendations.push('Consider configuring multiple LLM providers for redundancy.');
        }
        return recommendations;
    }
    broadcastBotStatus() {
        if (!this.io) {
            return;
        }
        this.io.emit('bot_status_broadcast', { timestamp: new Date().toISOString() });
    }
    broadcastSystemMetrics() {
        if (!this.io) {
            return;
        }
        this.io.sockets.sockets.forEach(socket => {
            this.sendSystemMetrics(socket);
        });
    }
    broadcastConfigChange() {
        if (!this.io) {
            return;
        }
        debug('Broadcasting configuration change');
        this.io.emit('config_changed', { timestamp: new Date().toISOString() });
        // Send updated data to all clients
        this.io.sockets.sockets.forEach(socket => {
            this.sendBotStatus(socket);
            this.sendConfigValidation(socket);
        });
    }
    sendMessageFlow(socket) {
        try {
            const messageFlow = this.getMessageFlow(50); // Last 50 messages
            socket.emit('message_flow_update', {
                messages: messageFlow,
                total: this.messageFlow.length,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            debug('Error sending message flow:', error);
            socket.emit('error', { message: 'Failed to get message flow' });
        }
    }
    sendAlerts(socket) {
        try {
            const alerts = this.getAlerts(20); // Last 20 alerts
            socket.emit('alerts_update', {
                alerts,
                total: this.alerts.length,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            debug('Error sending alerts:', error);
            socket.emit('error', { message: 'Failed to get alerts' });
        }
    }
    sendPerformanceMetrics(socket) {
        var _a;
        try {
            const metrics = this.getPerformanceMetrics(30); // Last 30 data points
            // Compute CPU usage percentage since last sample
            const nowHr = process.hrtime.bigint();
            const elapsedNs = Number(nowHr - this.lastHrTime);
            const elapsedMs = elapsedNs / 1000000;
            const currentCpu = process.cpuUsage(this.lastCpuUsage);
            const totalCpuMicros = currentCpu.user + currentCpu.system;
            const cpuCores = Math.max(1, ((_a = os_1.default.cpus()) === null || _a === void 0 ? void 0 : _a.length) || 1);
            // percent of a single core, normalized by core count
            const cpuPercent = elapsedMs > 0
                ? Math.min(100, Math.max(0, (totalCpuMicros / (elapsedMs * 1000)) * (100 / cpuCores)))
                : 0;
            this.lastCpuUsage = process.cpuUsage();
            this.lastHrTime = nowHr;
            // Approximate response time as average processingTime of last 10 message events (if present)
            const recentWithTimes = this.messageFlow
                .slice(-20)
                .map(m => m.processingTime)
                .filter((t) => typeof t === 'number' && isFinite(t));
            const avgResponse = recentWithTimes.length
                ? Math.round(recentWithTimes.reduce((a, b) => a + b, 0) / recentWithTimes.length)
                : 0;
            const currentMetric = {
                timestamp: new Date().toISOString(),
                responseTime: avgResponse,
                memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                cpuUsage: Math.round(cpuPercent),
                activeConnections: this.connectedClients,
                messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
                errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
            };
            this.performanceMetrics.push(currentMetric);
            if (this.performanceMetrics.length > 100) {
                this.performanceMetrics = this.performanceMetrics.slice(-100);
            }
            socket.emit('performance_metrics_update', {
                metrics: [...metrics, currentMetric],
                current: currentMetric,
                history: {
                    messageRate: this.getMessageRateHistory(),
                    errorRate: this.getErrorRateHistory(),
                },
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            debug('Error sending performance metrics:', error);
            socket.emit('error', { message: 'Failed to get performance metrics' });
        }
    }
    sendMonitoringDashboard(socket) {
        try {
            const manager = BotConfigurationManager_1.BotConfigurationManager.getInstance();
            const bots = manager.getAllBots();
            const totalBots = bots.length;
            const activeBots = totalBots; // without runtime signals, assume all configured are active
            const dashboard = {
                summary: {
                    totalBots,
                    activeBots,
                    totalMessages: this.messageFlow.length,
                    totalAlerts: this.alerts.length,
                    uptime: process.uptime(),
                    connectedClients: this.connectedClients,
                },
                recentActivity: {
                    messages: this.getMessageFlow(10),
                    alerts: this.getAlerts(5),
                },
                performance: {
                    current: {
                        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                        messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
                        errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
                    },
                    history: {
                        messageRate: this.getMessageRateHistory(),
                        errorRate: this.getErrorRateHistory(),
                    },
                },
                timestamp: new Date().toISOString(),
            };
            socket.emit('monitoring_dashboard_update', dashboard);
        }
        catch (error) {
            debug('Error sending monitoring dashboard:', error);
            socket.emit('error', { message: 'Failed to get monitoring dashboard' });
        }
    }
    sendApiStatus(socket) {
        try {
            const statuses = this.apiMonitorService.getAllStatuses();
            const overallHealth = this.apiMonitorService.getOverallHealth();
            socket.emit('api_status_update', {
                endpoints: statuses,
                overall: overallHealth,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            debug('Error sending API status:', error);
            socket.emit('error', { message: 'Failed to get API status' });
        }
    }
    sendApiEndpoints(socket) {
        try {
            const endpoints = this.apiMonitorService.getAllEndpoints();
            socket.emit('api_endpoints_update', {
                endpoints,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            debug('Error sending API endpoints:', error);
            socket.emit('error', { message: 'Failed to get API endpoints' });
        }
    }
    shutdown() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }
        if (this.io) {
            try {
                // Proactively disconnect sockets without touching the underlying HTTP server
                try {
                    this.io.sockets.sockets.forEach((socket) => {
                        try {
                            socket.disconnect(true);
                        }
                        catch ( /* ignore */_a) { /* ignore */ }
                    });
                }
                catch ( /* ignore */_a) { /* ignore */ }
                // Remove listeners to avoid emitting errors on the shared HTTP server
                this.io.removeAllListeners();
                // Avoid calling close() to prevent 'Server is not running' errors in certain environments
            }
            catch (error) {
                debug('Error during WebSocket shutdown:', error);
            }
            this.io = null;
        }
        // Clean up per-bot statistics to prevent memory leaks
        this.botMessageCounts.clear();
        this.botErrors.clear();
        debug('WebSocket service shut down');
    }
}
exports.WebSocketService = WebSocketService;
exports.default = WebSocketService;
