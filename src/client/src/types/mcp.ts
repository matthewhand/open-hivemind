/**
 * MCP (Model Context Protocol) Provider Types
 * Defines types for MCP provider configuration, status, and management
 */

export interface MCPProviderConfig {
    id: string;
    name: string;
    type: 'stdio' | 'sse' | 'websocket';
    command: string;
    args?: string[];
    env?: Record<string, string>;
    description?: string;
    enabled: boolean;
    autoStart?: boolean;
    timeout?: number;
    retryAttempts?: number;
    healthCheckInterval?: number;
}

export type MCPStatusType = 'connected' | 'disconnected' | 'connecting' | 'error' | 'stopped' | 'running';

export interface MCPProviderStatus {
    id: string;
    status: MCPStatusType;
    lastCheck: Date;
    error?: string;
    uptime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    connectionCount?: number;
    processId?: number;
}

export interface MCPProviderTestResult {
    providerId: string;
    success: boolean;
    timestamp: Date;
    latency?: number;
    duration?: number;
    error?: string;
    toolsAvailable?: string[];
    resourcesAvailable?: string[];
    version?: string;
}

export interface MCPProviderTemplate {
    id: string;
    name: string;
    description?: string;
    type: 'stdio' | 'sse' | 'websocket';
    command: string;
    args?: string[];
    env?: Record<string, string>;
    autoStart?: boolean;
    envVars?: MCPTemplateEnvVar[];
    category?: string;
}

export interface MCPTemplateEnvVar {
    name: string;
    description?: string;
    required?: boolean;
    default?: string;
}

export interface MCPProviderStats {
    total: number;
    connected: number;
    disconnected: number;
    error: number;
}

export interface MCPProviderEvents {
    provider_added: (provider: MCPProviderConfig) => void;
    provider_removed: (providerId: string) => void;
    provider_updated: (provider: MCPProviderConfig) => void;
    provider_started: (providerId: string) => void;
    provider_stopped: (providerId: string) => void;
    provider_error: (providerId: string, error: Error) => void;
    provider_test_completed: (result: MCPProviderTestResult) => void;
}
