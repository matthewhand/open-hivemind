import { EventEmitter } from 'events';
export interface Metrics {
    messagesProcessed: number;
    activeConnections: number;
    responseTime: number[];
    errors: number;
    uptime: number;
    llmTokenUsage: number;
}
export interface MetricData {
    name: string;
    value: number;
    timestamp: string;
    tags?: Record<string, string>;
}
export interface MetricDefinition {
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    description: string;
    unit: string;
}
export interface PerformanceMetrics {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
    responseTime: number;
    throughput: number;
}
export declare class MetricsCollector extends EventEmitter {
    private static instance;
    private metrics;
    private history;
    private isCollecting;
    private collectionInterval;
    static getInstance(): MetricsCollector;
    startCollection(): void;
    stopCollection(): void;
    private collectSystemMetrics;
    incrementMessages(): void;
    incrementRequestCount(): void;
    recordResponseTime(time: number): void;
    incrementErrors(): void;
    incrementErrorCount(): void;
    setActiveConnections(count: number): void;
    recordLlmTokenUsage(tokens: number): void;
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    getLatestValue(metricName: string): number | undefined;
    getAllMetrics(): MetricData[];
    getMetrics(): Metrics;
    getMetricsSummary(): {
        timestamp: string;
        metrics: Metrics;
        performance: PerformanceMetrics;
        historySize: number;
    };
    getPrometheusFormat(): string;
    exportMetricsData(): Promise<string>;
    reset(): void;
}
//# sourceMappingURL=MetricsCollector.d.ts.map