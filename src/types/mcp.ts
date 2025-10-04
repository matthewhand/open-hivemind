/**
 * MCP (Model Context Protocol) Provider Types
 *
 * This file defines the type system for MCP server providers, which allow
 * bots to connect to external tools and data sources via the MCP protocol.
 */

export interface MCPProviderConfig {
  id: string;
  name: string;
  type: 'desktop' | 'cloud';
  enabled: boolean;
  description?: string;
  command: string;
  args?: string[];
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
  type: 'desktop' | 'cloud';
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
}

export interface MCPProviderEvent {
  type: 'provider_added' | 'provider_removed' | 'provider_updated' |
        'provider_started' | 'provider_stopped' | 'provider_error' | 'provider_test_completed';
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