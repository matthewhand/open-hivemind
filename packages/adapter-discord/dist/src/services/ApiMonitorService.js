"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMonitorService = void 0;
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const debug = (0, debug_1.default)('app:ApiMonitorService');
const resolveFetch = async () => {
    if (typeof fetch === 'function') {
        return fetch;
    }
    const { default: nodeFetch } = await Promise.resolve().then(() => __importStar(require('node-fetch')));
    return nodeFetch;
};
class ApiMonitorService extends events_1.EventEmitter {
    constructor() {
        super();
        this.endpoints = new Map();
        this.statuses = new Map();
        this.monitoringIntervals = new Map();
        this.isMonitoring = false;
        // Increase max listeners for monitoring service
        this.setMaxListeners(20);
    }
    static getInstance() {
        if (!ApiMonitorService.instance) {
            ApiMonitorService.instance = new ApiMonitorService();
        }
        return ApiMonitorService.instance;
    }
    addEndpoint(config) {
        this.endpoints.set(config.id, config);
        this.initializeEndpointStatus(config);
        debug(`Added endpoint: ${config.name} (${config.url})`);
        if (config.enabled && config.interval) {
            this.startMonitoring(config.id);
        }
    }
    removeEndpoint(id) {
        this.stopMonitoring(id);
        this.endpoints.delete(id);
        this.statuses.delete(id);
        debug(`Removed endpoint: ${id}`);
    }
    updateEndpoint(id, config) {
        const existing = this.endpoints.get(id);
        if (!existing) {
            throw new Error(`Endpoint ${id} not found`);
        }
        const updatedConfig = { ...existing, ...config };
        this.endpoints.set(id, updatedConfig);
        // Restart monitoring if needed
        this.stopMonitoring(id);
        if (updatedConfig.enabled && updatedConfig.interval) {
            this.startMonitoring(id);
        }
        debug(`Updated endpoint: ${id}`);
    }
    getEndpoint(id) {
        return this.endpoints.get(id);
    }
    getAllEndpoints() {
        return Array.from(this.endpoints.values());
    }
    getEndpointStatus(id) {
        return this.statuses.get(id);
    }
    getAllStatuses() {
        return Array.from(this.statuses.values());
    }
    startMonitoring(id) {
        const config = this.endpoints.get(id);
        if (!config || !config.enabled || !config.interval) {
            return;
        }
        this.stopMonitoring(id);
        const interval = setInterval(() => {
            this.checkEndpoint(id);
        }, config.interval);
        this.monitoringIntervals.set(id, interval);
        debug(`Started monitoring: ${config.name}`);
    }
    stopMonitoring(id) {
        const interval = this.monitoringIntervals.get(id);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(id);
            debug(`Stopped monitoring: ${id}`);
        }
    }
    startAllMonitoring() {
        if (this.isMonitoring) {
            return;
        }
        this.endpoints.forEach((config, id) => {
            if (config.enabled && config.interval) {
                this.startMonitoring(id);
            }
        });
        this.isMonitoring = true;
        debug('Started monitoring all endpoints');
    }
    stopAllMonitoring() {
        this.monitoringIntervals.forEach((interval, id) => {
            clearInterval(interval);
        });
        this.monitoringIntervals.clear();
        this.isMonitoring = false;
        debug('Stopped monitoring all endpoints');
    }
    initializeEndpointStatus(config) {
        const status = {
            id: config.id,
            name: config.name,
            url: config.url,
            status: 'offline',
            responseTime: 0,
            lastChecked: new Date(),
            consecutiveFailures: 0,
            totalChecks: 0,
            successfulChecks: 0,
            averageResponseTime: 0,
        };
        this.statuses.set(config.id, status);
    }
    async checkEndpoint(id) {
        const config = this.endpoints.get(id);
        const status = this.statuses.get(id);
        if (!config || !status) {
            return;
        }
        const startTime = Date.now();
        status.lastChecked = new Date();
        try {
            const response = await this.performRequest(config);
            const responseTime = Date.now() - startTime;
            status.responseTime = responseTime;
            status.statusCode = response.status;
            status.totalChecks++;
            if (this.isSuccessfulResponse(config, response)) {
                status.status = this.getStatusFromResponseTime(responseTime);
                status.consecutiveFailures = 0;
                status.successfulChecks++;
                status.lastSuccessfulCheck = new Date();
                status.errorMessage = undefined;
                // Update average response time
                status.averageResponseTime =
                    (status.averageResponseTime * (status.successfulChecks - 1) + responseTime) /
                        status.successfulChecks;
            }
            else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            status.responseTime = responseTime;
            status.status = 'error';
            status.consecutiveFailures++;
            status.totalChecks++;
            status.errorMessage = error instanceof Error ? error.message : 'Unknown error';
            debug(`Endpoint check failed: ${config.name} - ${status.errorMessage}`);
        }
        // Emit status update
        this.emit('statusUpdate', status);
        // Emit health check result for logging
        const result = {
            endpointId: id,
            timestamp: status.lastChecked,
            success: status.status === 'online' || status.status === 'slow',
            responseTime: status.responseTime,
            statusCode: status.statusCode,
            errorMessage: status.errorMessage,
        };
        this.emit('healthCheckResult', result);
    }
    async performRequest(config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000);
        try {
            const fetchImpl = await resolveFetch();
            const response = await fetchImpl(config.url, {
                method: config.method,
                headers: {
                    'User-Agent': 'Open-Hivemind API Monitor',
                    ...config.headers,
                },
                body: config.body ? JSON.stringify(config.body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    isSuccessfulResponse(config, response) {
        const expectedCodes = config.expectedStatusCodes || [200, 201, 202, 204];
        return expectedCodes.includes(response.status);
    }
    getStatusFromResponseTime(responseTime) {
        return responseTime > 5000 ? 'slow' : 'online'; // 5 seconds threshold
    }
    getOverallHealth() {
        const statuses = Array.from(this.statuses.values());
        const stats = {
            total: statuses.length,
            online: 0,
            slow: 0,
            offline: 0,
            error: 0,
        };
        statuses.forEach(status => {
            switch (status.status) {
                case 'online':
                    stats.online++;
                    break;
                case 'slow':
                    stats.slow++;
                    break;
                case 'offline':
                    stats.offline++;
                    break;
                case 'error':
                    stats.error++;
                    break;
            }
        });
        let overallStatus = 'healthy';
        let message = 'All monitored APIs are operational';
        if (stats.error > 0) {
            overallStatus = 'error';
            message = `${stats.error} API endpoint(s) are experiencing errors`;
        }
        else if (stats.offline > 0) {
            overallStatus = 'error';
            message = `${stats.offline} API endpoint(s) are offline`;
        }
        else if (stats.slow > 0) {
            overallStatus = 'warning';
            message = `${stats.slow} API endpoint(s) are responding slowly`;
        }
        return { status: overallStatus, message, stats };
    }
}
exports.ApiMonitorService = ApiMonitorService;
exports.default = ApiMonitorService;
