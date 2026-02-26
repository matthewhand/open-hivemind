"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const events_1 = require("events");
class MetricsCollector extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.metrics = {
            messagesProcessed: 0,
            activeConnections: 0,
            responseTime: [],
            errors: 0,
            uptime: Date.now(),
            llmTokenUsage: 0,
        };
        this.history = [];
        this.isCollecting = false;
        this.collectionInterval = null;
    }
    static getInstance() {
        if (!MetricsCollector.instance) {
            MetricsCollector.instance = new MetricsCollector();
        }
        return MetricsCollector.instance;
    }
    startCollection() {
        if (this.isCollecting) {
            return;
        }
        this.isCollecting = true;
        this.collectionInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 5000);
        this.emit('metricsCollected', this.getMetricsSummary());
    }
    stopCollection() {
        if (!this.isCollecting) {
            return;
        }
        this.isCollecting = false;
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = null;
        }
    }
    collectSystemMetrics() {
        const timestamp = new Date().toISOString();
        // Collect CPU usage (placeholder)
        const cpuUsage = Math.random() * 100;
        this.recordMetric('cpu_usage', cpuUsage, { timestamp });
        // Collect memory usage
        const memoryUsage = process.memoryUsage();
        this.recordMetric('memory_usage', memoryUsage.heapUsed / 1024 / 1024, { timestamp });
        // Emit collected metrics
        this.emit('metricsCollected', this.getMetricsSummary());
    }
    incrementMessages() {
        this.metrics.messagesProcessed++;
        this.recordMetric('messages_processed', this.metrics.messagesProcessed);
    }
    incrementRequestCount() {
        this.incrementMessages();
    }
    recordResponseTime(time) {
        this.metrics.responseTime.push(time);
        if (this.metrics.responseTime.length > 100) {
            this.metrics.responseTime.shift();
        }
        this.recordMetric('response_time', time);
    }
    incrementErrors() {
        this.metrics.errors++;
        this.recordMetric('errors', this.metrics.errors);
    }
    incrementErrorCount() {
        this.incrementErrors();
    }
    setActiveConnections(count) {
        this.metrics.activeConnections = count;
        this.recordMetric('active_connections', count);
    }
    recordLlmTokenUsage(tokens) {
        this.metrics.llmTokenUsage += tokens;
        this.recordMetric('llm_token_usage', this.metrics.llmTokenUsage);
    }
    recordMetric(name, value, tags) {
        const metricData = {
            name,
            value,
            timestamp: new Date().toISOString(),
            tags,
        };
        this.history.push(metricData);
        // Keep only last 1000 metrics
        if (this.history.length > 1000) {
            this.history = this.history.slice(-1000);
        }
        this.emit('metricRecorded', metricData);
    }
    getLatestValue(metricName) {
        const latestMetric = this.history
            .filter(m => m.name === metricName)
            .pop();
        return latestMetric === null || latestMetric === void 0 ? void 0 : latestMetric.value;
    }
    getAllMetrics() {
        return [...this.history];
    }
    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.uptime,
        };
    }
    getMetricsSummary() {
        const avgResponseTime = this.metrics.responseTime.length > 0
            ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
            : 0;
        const performance = {
            cpuUsage: this.getLatestValue('cpu_usage') || 0,
            memoryUsage: this.getLatestValue('memory_usage') || 0,
            diskUsage: Math.random() * 100, // placeholder
            networkIO: Math.random() * 1000, // placeholder
            responseTime: avgResponseTime,
            throughput: this.metrics.messagesProcessed / ((Date.now() - this.metrics.uptime) / 1000),
        };
        return {
            timestamp: new Date().toISOString(),
            metrics: this.getMetrics(),
            performance,
            historySize: this.history.length,
        };
    }
    getPrometheusFormat() {
        const m = this.getMetrics();
        const avgResponseTime = m.responseTime.length > 0
            ? m.responseTime.reduce((a, b) => a + b, 0) / m.responseTime.length
            : 0;
        return `# HELP hivemind_messages_total Total messages processed
# TYPE hivemind_messages_total counter
hivemind_messages_total ${m.messagesProcessed}

# HELP hivemind_active_connections Current active connections
# TYPE hivemind_active_connections gauge
hivemind_active_connections ${m.activeConnections}

# HELP hivemind_response_time_ms Average response time in milliseconds
# TYPE hivemind_response_time_ms gauge
hivemind_response_time_ms ${avgResponseTime}

# HELP hivemind_errors_total Total errors encountered
# TYPE hivemind_errors_total counter
hivemind_errors_total ${m.errors}

# HELP hivemind_uptime_seconds Uptime in seconds
# TYPE hivemind_uptime_seconds gauge
hivemind_uptime_seconds ${Math.floor(m.uptime / 1000)}

# HELP hivemind_llm_token_usage_total Total LLM token usage
# TYPE hivemind_llm_token_usage_total counter
hivemind_llm_token_usage_total ${m.llmTokenUsage}`;
    }
    async exportMetricsData() {
        const metricsData = {
            timestamp: new Date().toISOString(),
            current: this.getMetrics(),
            history: this.history,
            summary: this.getMetricsSummary(),
        };
        return JSON.stringify(metricsData, null, 2);
    }
    reset() {
        this.metrics = {
            messagesProcessed: 0,
            activeConnections: 0,
            responseTime: [],
            errors: 0,
            uptime: Date.now(),
            llmTokenUsage: 0,
        };
        this.history = [];
        console.log('📊 Metrics reset');
    }
}
exports.MetricsCollector = MetricsCollector;
