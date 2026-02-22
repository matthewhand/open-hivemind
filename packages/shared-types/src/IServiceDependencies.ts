import type { ILlmProvider, GetLlmProviderFn } from './ILlmProvider';
import type { IBotConfig, GetBotConfigFn } from './IBotConfig';
import type { IErrorTypes } from './IErrorTypes';
import type { IMessage } from './IMessage';

/**
 * WebSocket service interface for real-time updates.
 */
export interface IWebSocketService {
    broadcast: (event: string, data: any) => void;
    emit: (event: string, data: any) => void;
}

/**
 * Metrics collector interface for monitoring.
 */
export interface IMetricsCollector {
    increment: (metric: string, value?: number, tags?: Record<string, string>) => void;
    decrement: (metric: string, value?: number, tags?: Record<string, string>) => void;
    gauge: (metric: string, value: number, tags?: Record<string, string>) => void;
    timing: (metric: string, value: number, tags?: Record<string, string>) => void;
}

/**
 * Channel router interface for message routing.
 */
export interface IChannelRouter {
    routeMessage: (message: IMessage) => Promise<void>;
}

/**
 * Logger interface for adapters.
 */
export interface ILogger {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
}

/**
 * Container for all dependencies that need to be injected into adapters.
 * This allows adapters to be completely decoupled from the main application.
 */
export interface IServiceDependencies {
    /** Function to get LLM provider instances */
    getLlmProvider: GetLlmProviderFn;
    /** Function to get bot configuration */
    getBotConfig: GetBotConfigFn;
    /** WebSocket service for real-time updates */
    webSocketService?: IWebSocketService;
    /** Metrics collector for monitoring */
    metricsCollector?: IMetricsCollector;
    /** Channel router for message routing */
    channelRouter?: IChannelRouter;
    /** Logger instance */
    logger: ILogger;
    /** Error types for creating consistent errors */
    errorTypes: IErrorTypes;
}
