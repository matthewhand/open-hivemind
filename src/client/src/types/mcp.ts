/**
 * MCP (Model Context Protocol) Provider Types
 * Defines types for MCP provider configuration, status, and management
 *
 * IMPORTANT TYPE DISTINCTION:
 * - MCPProviderType ('desktop' | 'cloud'): High-level categorization of where the MCP server runs
 *   - 'desktop': Local MCP server running on the same machine as the bot
 *   - 'cloud': Remote MCP server accessed via network
 *
 * - MCPTransportType ('stdio' | 'sse' | 'websocket' | 'streamable-http'): Low-level communication protocol
 *   This is used internally by the MCP SDK (see packages/tool-mcp) and should not be confused
 *   with the provider type.
 *
 * MIGRATION NOTE:
 * If you were previously using 'stdio'/'sse'/'websocket' as provider types, use the
 * mapTransportToProviderType() helper function to convert them to the correct provider type.
 */

/**
 * MCP Provider Type
 * - desktop: Local MCP server running on the same machine
 * - cloud: Remote MCP server accessed via network
 */
export type MCPProviderType = 'desktop' | 'cloud';

/**
 * MCP Transport Protocol (used internally by the MCP SDK)
 * Note: This is separate from provider type and defines the communication protocol
 */
export type MCPTransportType = 'stdio' | 'sse' | 'websocket' | 'streamable-http';

export interface MCPProviderConfig {
    id: string;
    name: string;
    type: MCPProviderType;
    command: string;
    args?: string[] | string;
    env?: Record<string, string>;
    description?: string;
    enabled: boolean;
    autoStart?: boolean;
    autoRestart?: boolean;
    timeout?: number;
    retryAttempts?: number;
    healthCheckInterval?: number;
    healthCheck?: MCPHealthCheck;
}

export interface MCPHealthCheck {
    enabled: boolean;
    interval: number; // seconds
    timeout: number; // seconds
    retries: number;
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
    type: MCPProviderType;
    command: string;
    args?: string[];
    env?: Record<string, string>;
    autoStart?: boolean;
    envVars?: MCPTemplateEnvVar[];
    category?: string;
    enabledByDefault?: boolean;
    documentation?: string;
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

export interface MCPProviderValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}

/**
 * Type Guards for MCP Provider Types
 */

export function isMCPProviderType(value: unknown): value is MCPProviderType {
    return value === 'desktop' || value === 'cloud';
}

export function isMCPTransportType(value: unknown): value is MCPTransportType {
    return value === 'stdio' || value === 'sse' || value === 'websocket' || value === 'streamable-http';
}

export function isValidMCPProviderConfig(config: unknown): config is MCPProviderConfig {
    if (!config || typeof config !== 'object') return false;

    const c = config as Partial<MCPProviderConfig>;

    return (
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        isMCPProviderType(c.type) &&
        typeof c.command === 'string' &&
        typeof c.enabled === 'boolean' &&
        (c.args === undefined || Array.isArray(c.args) || typeof c.args === 'string') &&
        (c.env === undefined || (typeof c.env === 'object' && c.env !== null)) &&
        (c.description === undefined || typeof c.description === 'string') &&
        (c.timeout === undefined || typeof c.timeout === 'number') &&
        (c.autoStart === undefined || typeof c.autoStart === 'boolean') &&
        (c.autoRestart === undefined || typeof c.autoRestart === 'boolean')
    );
}

export function validateMCPProviderType(type: string): MCPProviderType {
    if (!isMCPProviderType(type)) {
        throw new Error(`Invalid MCP provider type: ${type}. Must be 'desktop' or 'cloud'`);
    }
    return type;
}

export function validateMCPTransportType(transport: string): MCPTransportType {
    if (!isMCPTransportType(transport)) {
        throw new Error(`Invalid MCP transport type: ${transport}. Must be 'stdio', 'sse', 'websocket', or 'streamable-http'`);
    }
    return transport;
}

/**
 * Backward compatibility: Map legacy transport types to provider types
 * This helps migration from old 'stdio'/'sse'/'websocket' to 'desktop'/'cloud'
 */
export function mapTransportToProviderType(transport: string): MCPProviderType {
    if (transport === 'stdio') return 'desktop';
    if (transport === 'sse' || transport === 'websocket' || transport === 'streamable-http') return 'cloud';

    // If already a provider type, validate and return
    if (isMCPProviderType(transport)) return transport;

    throw new Error(`Cannot map unknown transport type to provider type: ${transport}`);
}
