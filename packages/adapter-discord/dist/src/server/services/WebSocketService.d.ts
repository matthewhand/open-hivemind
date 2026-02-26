import type { Server as HttpServer } from 'http';
export interface MessageFlowEvent {
    id: string;
    timestamp: string;
    botName: string;
    provider: string;
    channelId: string;
    userId: string;
    messageType: 'incoming' | 'outgoing';
    contentLength: number;
    processingTime?: number;
    status: 'success' | 'error' | 'timeout';
    errorMessage?: string;
}
export interface PerformanceMetric {
    timestamp: string;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    messageRate: number;
    errorRate: number;
}
export interface AlertEvent {
    id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    botName?: string;
    channelId?: string;
    metadata?: Record<string, any>;
}
export declare class WebSocketService {
    private static instance;
    private io;
    private metricsInterval;
    private connectedClients;
    private messageFlow;
    private performanceMetrics;
    private alerts;
    private messageRateHistory;
    private errorRateHistory;
    private lastCpuUsage;
    private lastHrTime;
    private botMessageCounts;
    private botErrors;
    private apiMonitorService;
    private constructor();
    private initializeMonitoringData;
    private setupApiMonitoring;
    private handleApiStatusUpdate;
    private handleApiHealthCheckResult;
    static getInstance(): WebSocketService;
    recordMessageFlow(event: Omit<MessageFlowEvent, 'id' | 'timestamp'>): void;
    recordAlert(alert: Omit<AlertEvent, 'id' | 'timestamp'>): void;
    getMessageFlow(limit?: number): MessageFlowEvent[];
    getAlerts(limit?: number): AlertEvent[];
    getPerformanceMetrics(limit?: number): PerformanceMetric[];
    getMessageRateHistory(): number[];
    getErrorRateHistory(): number[];
    getBotStats(botName: string): {
        messageCount: number;
        errors: string[];
    };
    getAllBotStats(): Record<string, {
        messageCount: number;
        errors: string[];
    }>;
    private updateMessageRate;
    private updateErrorRate;
    initialize(server: HttpServer): void;
    /**
     * Sets up WebSocket event handlers for client connections
     * Handles connection, disconnection, and various client requests
     */
    private setupEventHandlers;
    /**
     * Starts periodic metrics collection and broadcasting
     * Sends bot status and system metrics updates every 5 seconds to connected clients
     */
    private startMetricsCollection;
    private broadcastMonitoringData;
    private sendBotStatus;
    private sendSystemMetrics;
    private sendConfigValidation;
    private findMissingConfigurations;
    private generateRecommendations;
    private broadcastBotStatus;
    private broadcastSystemMetrics;
    broadcastConfigChange(): void;
    private sendMessageFlow;
    private sendAlerts;
    private sendPerformanceMetrics;
    private sendMonitoringDashboard;
    private sendApiStatus;
    private sendApiEndpoints;
    shutdown(): void;
}
export default WebSocketService;
//# sourceMappingURL=WebSocketService.d.ts.map