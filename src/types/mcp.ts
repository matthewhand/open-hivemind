/**
 * MCP (Model Context Protocol) Provider Types
 *
 * This file defines the type system for MCP server providers, which allow
 * bots to connect to external tools and data sources via the MCP protocol.
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
  enabled: boolean;
  description?: string;
  command: string;
  args?: string[] | string;
  env?: Record<string, string>;
  timeout?: number;
  autoRestart?: boolean;
  healthCheck?: MCPHealthCheck;
}

export interface MCPHealthCheck {
  enabled: boolean;
  interval: number; // seconds
  timeout: number; // seconds
  retries: number;
}

export interface MCPProviderStatus {
  id: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  lastCheck: Date;
  uptime?: number;
  memoryUsage?: number;
  error?: string;
  processId?: number;
  version?: string;
  capabilities?: string[];
}

export interface MCPProviderTestResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: string;
  output?: string;
  version?: string;
  capabilities?: string[];
}

export interface MCPProviderTemplate {
  id: string;
  name: string;
  type: MCPProviderType;
  description: string;
  category: string;
  command: string;
  args: string[];
  envVars: {
    name: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }[];
  enabledByDefault: boolean;
  documentation?: string;
}

export interface MCPProviderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface MCPProviderManager {
  // Core provider management
  addProvider(config: MCPProviderConfig): Promise<void>;
  removeProvider(id: string): Promise<void>;
  updateProvider(id: string, config: Partial<MCPProviderConfig>): Promise<void>;
  getProvider(id: string): MCPProviderConfig | null;
  getAllProviders(): MCPProviderConfig[];

  // Status and testing
  getProviderStatus(id: string): MCPProviderStatus | null;
  getAllProviderStatuses(): Record<string, MCPProviderStatus>;
  testProvider(id: string): Promise<MCPProviderTestResult>;

  // Lifecycle management
  startProvider(id: string): Promise<void>;
  stopProvider(id: string): Promise<void>;
  restartProvider(id: string): Promise<void>;

  // Configuration
  validateProviderConfig(config: Partial<MCPProviderConfig>): MCPProviderValidationResult;
  exportProviders(): string;
  importProviders(data: string): Promise<void>;

  // Templates
  getTemplates(): MCPProviderTemplate[];
  createFromTemplate(templateId: string, overrides: Partial<MCPProviderConfig>): MCPProviderConfig;

  // Tools
  getToolSchema?(providerId: string, toolName: string): any;
}

export interface MCPProviderEvent {
  type:
    | 'provider_added'
    | 'provider_removed'
    | 'provider_updated'
    | 'provider_started'
    | 'provider_stopped'
    | 'provider_error'
    | 'provider_test_completed';
  providerId: string;
  timestamp: Date;
  data?: any;
}

export interface MCPProviderStats {
  totalProviders: number;
  runningProviders: number;
  stoppedProviders: number;
  errorProviders: number;
  averageUptime: number;
  totalMemoryUsage: number;
  lastUpdated: Date;
}

/**
 * Type Guards for MCP Provider Types
 */

export function isMCPProviderType(value: unknown): value is MCPProviderType {
  return value === 'desktop' || value === 'cloud';
}

export function isMCPTransportType(value: unknown): value is MCPTransportType {
  return (
    value === 'stdio' || value === 'sse' || value === 'websocket' || value === 'streamable-http'
  );
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
    throw new Error(
      `Invalid MCP transport type: ${transport}. Must be 'stdio', 'sse', 'websocket', or 'streamable-http'`
    );
  }
  return transport;
}

/**
 * Backward compatibility: Map legacy transport types to provider types
 * This helps migration from old 'stdio'/'sse'/'websocket' to 'desktop'/'cloud'
 */
export function mapTransportToProviderType(transport: string): MCPProviderType {
  if (transport === 'stdio') return 'desktop';
  if (transport === 'sse' || transport === 'websocket' || transport === 'streamable-http')
    return 'cloud';

  // If already a provider type, validate and return
  if (isMCPProviderType(transport)) return transport;

  throw new Error(`Cannot map unknown transport type to provider type: ${transport}`);
}
