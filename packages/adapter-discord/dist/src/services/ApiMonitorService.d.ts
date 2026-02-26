import { EventEmitter } from 'events';
export interface EndpointConfig {
    id: string;
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';
    headers?: Record<string, string>;
    body?: any;
    expectedStatusCodes?: number[];
    timeout?: number;
    interval?: number;
    enabled: boolean;
    retries?: number;
    retryDelay?: number;
}
export interface EndpointStatus {
    id: string;
    name: string;
    url: string;
    status: 'online' | 'offline' | 'slow' | 'error';
    responseTime: number;
    lastChecked: Date;
    lastSuccessfulCheck?: Date;
    consecutiveFailures: number;
    totalChecks: number;
    successfulChecks: number;
    averageResponseTime: number;
    errorMessage?: string;
    statusCode?: number;
    sslExpiry?: Date;
    sslValid?: boolean;
}
export interface HealthCheckResult {
    endpointId: string;
    timestamp: Date;
    success: boolean;
    responseTime: number;
    statusCode?: number;
    errorMessage?: string;
}
export declare class ApiMonitorService extends EventEmitter {
    private static instance;
    private endpoints;
    private statuses;
    private monitoringIntervals;
    private isMonitoring;
    private constructor();
    static getInstance(): ApiMonitorService;
    addEndpoint(config: EndpointConfig): void;
    removeEndpoint(id: string): void;
    updateEndpoint(id: string, config: Partial<EndpointConfig>): void;
    getEndpoint(id: string): EndpointConfig | undefined;
    getAllEndpoints(): EndpointConfig[];
    getEndpointStatus(id: string): EndpointStatus | undefined;
    getAllStatuses(): EndpointStatus[];
    startMonitoring(id: string): void;
    stopMonitoring(id: string): void;
    startAllMonitoring(): void;
    stopAllMonitoring(): void;
    private initializeEndpointStatus;
    private checkEndpoint;
    private performRequest;
    private isSuccessfulResponse;
    private getStatusFromResponseTime;
    getOverallHealth(): {
        status: 'healthy' | 'warning' | 'error';
        message: string;
        stats: {
            total: number;
            online: number;
            slow: number;
            offline: number;
            error: number;
        };
    };
}
export default ApiMonitorService;
//# sourceMappingURL=ApiMonitorService.d.ts.map