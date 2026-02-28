import Debug from 'debug';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { HivemindError, ErrorUtils } from '@src/types/errors';
import type {
  MCPProviderConfig,
  MCPProviderStatus,
  MCPProviderTestResult,
  MCPProviderTemplate,
  MCPProviderValidationResult,
  MCPProviderManager as IMCPProviderManager,
  MCPProviderStats,
} from '../types/mcp';
import {
  MCPProviderEvent,
} from '../types/mcp';

const debug = Debug('app:MCPProviderManager');

/**
 * MCP Provider Manager
 *
 * Manages lifecycle, configuration, and testing of MCP (Model Context Protocol)
 * servers that provide external tool capabilities to bots.
 */
export class MCPProviderManager extends EventEmitter implements IMCPProviderManager {
  private providers = new Map<string, MCPProviderConfig>();
  private processes = new Map<string, ChildProcess>();
  private statuses = new Map<string, MCPProviderStatus>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    debug('MCP Provider Manager initialized');
  }

  // Core provider management
  async addProvider(config: MCPProviderConfig): Promise<void> {
    debug(`Adding MCP provider: ${config.name}`);

    if (!["node", "npm", "npx", "python", "python3"].includes(config.command)) {
      throw ErrorUtils.createError(
        `Command "${config.command}" is not allowed. Allowed commands: node, npm, npx, python, python3`,
        "security",
        "MCP_PROVIDER_COMMAND_NOT_ALLOWED"
      );
    }

    const validation = this.validateProviderConfig(config);
    if (!validation.isValid) {
      throw ErrorUtils.createError(
        `Invalid MCP provider configuration: ${validation.errors.join(', ')}`,
        'validation',
        'MCP_PROVIDER_CONFIG_INVALID',
        undefined,
        { validationErrors: validation.errors },
      );
    }

    // Ensure unique ID
    const providerId = config.id || uuidv4();
    const provider = { ...config, id: providerId };

    this.providers.set(providerId, provider);

    // Initialize status
    this.statuses.set(providerId, {
      id: providerId,
      status: 'stopped',
      lastCheck: new Date(),
    });

    this.emit('provider_added', { type: 'provider_added', providerId, timestamp: new Date() });
    debug(`MCP provider added: ${provider.name} (${providerId})`);
  }

  async removeProvider(id: string): Promise<void> {
    debug(`Removing MCP provider: ${id}`);

    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`MCP provider not found: ${id}`);
    }

    // Stop provider if running
    if (this.processes.has(id)) {
      await this.stopProvider(id);
    }

    this.providers.delete(id);
    this.statuses.delete(id);

    this.emit('provider_removed', { type: 'provider_removed', providerId: id, timestamp: new Date() });
    debug(`MCP provider removed: ${provider.name} (${id})`);
  }

  async updateProvider(id: string, config: Partial<MCPProviderConfig>): Promise<void> {
    debug(`Updating MCP provider: ${id}`);

    if (config.command && !["node", "npm", "npx", "python", "python3"].includes(config.command)) {
      throw ErrorUtils.createError(
        `Command "${config.command}" is not allowed. Allowed commands: node, npm, npx, python, python3`,
        "security",
        "MCP_PROVIDER_COMMAND_NOT_ALLOWED"
      );
    }

    const existingProvider = this.providers.get(id);
    if (!existingProvider) {
      throw new Error(`MCP provider not found: ${id}`);
    }

    const validation = this.validateProviderConfig({ ...existingProvider, ...config });
    if (!validation.isValid) {
      throw ErrorUtils.createError(
        `Invalid MCP provider configuration: ${validation.errors.join(', ')}`,
        'validation',
        'MCP_PROVIDER_CONFIG_INVALID',
        undefined,
        { validationErrors: validation.errors, providerId: id },
      );
    }

    const updatedProvider = { ...existingProvider, ...config };
    this.providers.set(id, updatedProvider);

    this.emit('provider_updated', {
      type: 'provider_updated',
      providerId: id,
      timestamp: new Date(),
      data: { oldProvider: existingProvider, newProvider: updatedProvider },
    });
    debug(`MCP provider updated: ${updatedProvider.name} (${id})`);
  }

  getProvider(id: string): MCPProviderConfig | null {
    return this.providers.get(id) || null;
  }

  getAllProviders(): MCPProviderConfig[] {
    return Array.from(this.providers.values());
  }

  // Status and testing
  getProviderStatus(id: string): MCPProviderStatus | null {
    return this.statuses.get(id) || null;
  }

  getAllProviderStatuses(): Record<string, MCPProviderStatus> {
    const result: Record<string, MCPProviderStatus> = {};
    this.statuses.forEach((status, id) => {
      result[id] = status;
    });
    return result;
  }

  async testProvider(id: string): Promise<MCPProviderTestResult> {
    debug(`Testing MCP provider: ${id}`);

    const provider = this.providers.get(id);
    if (!provider) {
      throw ErrorUtils.createError(
        `MCP provider not found: ${id}`,
        'configuration',
        'MCP_PROVIDER_NOT_FOUND',
        undefined,
        { providerId: id },
      );
    }

    const startTime = new Date();

    try {
      const result = await this.executeProviderTest(provider);
      const endTime = new Date();

      const testResult: MCPProviderTestResult = {
        success: result.success,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: result.error,
        output: result.output,
        version: result.version,
        capabilities: result.capabilities,
      };

      this.emit('provider_test_completed', {
        type: 'provider_test_completed',
        providerId: id,
        timestamp: new Date(),
        data: testResult,
      });

      debug(`MCP provider test completed: ${provider.name} (${id}) - ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
      return testResult;

    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      const endTime = new Date();
      const testResult: MCPProviderTestResult = {
        success: false,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: hivemindError.message,
      };

      debug(`MCP provider test failed: ${provider.name} (${id}) -`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        providerId: id,
      });
      return testResult;
    }
  }

  // Lifecycle management
  async startProvider(id: string): Promise<void> {
    debug(`Starting MCP provider: ${id}`);

    const provider = this.providers.get(id);
    if (!provider) {
      throw ErrorUtils.createError(
        `MCP provider not found: ${id}`,
        'configuration',
        'MCP_PROVIDER_NOT_FOUND',
        undefined,
        { providerId: id },
      );
    }

    if (this.processes.has(id)) {
      debug(`MCP provider already running: ${provider.name} (${id})`);
      return;
    }

    try {
      const process = await this.startProviderProcess(provider);
      this.processes.set(id, process);

      // Update status
      this.statuses.set(id, {
        id,
        status: 'running',
        lastCheck: new Date(),
        uptime: 0,
        processId: process.pid,
      });

      // Start health check if enabled
      if (provider.healthCheck?.enabled) {
        this.startHealthCheck(id);
      }

      this.emit('provider_started', { type: 'provider_started', providerId: id, timestamp: new Date() });
      debug(`MCP provider started: ${provider.name} (${id})`);

    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      this.statuses.set(id, {
        id,
        status: 'error',
        lastCheck: new Date(),
        error: hivemindError.message,
      });

      debug(`Failed to start MCP provider: ${provider.name} (${id}) -`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        providerId: id,
      });

      this.emit('provider_error', {
        type: 'provider_error',
        providerId: id,
        timestamp: new Date(),
        data: { error: hivemindError },
      });

      throw hivemindError;
    }
  }

  async stopProvider(id: string): Promise<void> {
    debug(`Stopping MCP provider: ${id}`);

    const provider = this.providers.get(id);
    if (!provider) {
      throw ErrorUtils.createError(
        `MCP provider not found: ${id}`,
        'configuration',
        'MCP_PROVIDER_NOT_FOUND',
        undefined,
        { providerId: id },
      );
    }

    const process = this.processes.get(id);
    if (!process) {
      debug(`MCP provider not running: ${provider.name} (${id})`);
      return;
    }

    // Stop health check
    this.stopHealthCheck(id);

    // Kill process
    process.kill('SIGTERM');

    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (process && !process.killed) {
      process.kill('SIGKILL');
    }

    this.processes.delete(id);
    this.statuses.set(id, {
      id,
      status: 'stopped',
      lastCheck: new Date(),
    });

    this.emit('provider_stopped', { type: 'provider_stopped', providerId: id, timestamp: new Date() });
    debug(`MCP provider stopped: ${provider.name} (${id})`);
  }

  async restartProvider(id: string): Promise<void> {
    debug(`Restarting MCP provider: ${id}`);
    await this.stopProvider(id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startProvider(id);
  }

  // Configuration
  validateProviderConfig(config: Partial<MCPProviderConfig>): MCPProviderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!config.name || (config.name as string).trim().length < 2) {
      errors.push('Provider name is required and must be at least 2 characters');
    }

    if (!config.command || (config.command as string).trim().length === 0) {
      errors.push('Command is required');
    }

    if (!config.type || !['desktop', 'cloud'].includes(config.type)) {
      errors.push('Provider type must be either "desktop" or "cloud"');
    }

    // Command validation
    if (config.command) {
      const command = (config.command as string).trim();

      // Security validation: Block dangerous shell commands
      const blockedCommands = [
        'sh', 'bash', 'zsh', 'dash', 'csh', 'ksh', 'tcsh',
        'cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh',
      ];

      const isBlocked = blockedCommands.some(blocked => {
        const lowerCommand = command.toLowerCase();
        // Check exact match
        if (lowerCommand === blocked) return true;
        // Check if it ends with the blocked command (e.g. /bin/sh)
        // using forward slash or backslash as separator
        // blocked commands are lowercase in the list
        const pattern = new RegExp(`[\\/\\\\]${blocked}$`);
        return pattern.test(lowerCommand);
      });

      if (isBlocked) {
        errors.push('Command is not allowed for security reasons');
      }

      const validCommandPatterns = [
        /^[a-zA-Z0-9\-_]+$/,
        /^\.\/[a-zA-Z0-9\-_\/.]+$/,
        /^\/[a-zA-Z0-9\-_\/.]+$/,
        /^[a-zA-Z]:\\[a-zA-Z0-9\-_\/.\\]+$/,
        /^npx [a-zA-Z0-9\-@/.]+$/,
        /^npm run [a-zA-Z0-9\-_]+$/,
      ];

      const isValidCommand = validCommandPatterns.some(pattern => pattern.test(command));
      if (!isValidCommand) {
        errors.push('Invalid command format');
      }
    }

    // Args validation
    if (config.args && typeof config.args === 'string') {
      try {
        // Try to parse as JSON array
        JSON.parse(config.args);
      } catch {
        // If not valid JSON, it's treated as space-separated
        if ((config.args as string).trim().length === 0) {
          warnings.push('Arguments field is empty');
        }
      }
    }

    // Cloud provider warnings
    if (config.type === 'cloud') {
      const envVars = config.env || {};
      const hasConnectionConfig = Object.keys(envVars).some(key =>
        key.toLowerCase().includes('url') ||
        key.toLowerCase().includes('endpoint') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token'),
      );

      if (!hasConnectionConfig) {
        warnings.push('Cloud providers typically require connection configuration (URLs, API keys, etc.)');
      }
    }

    // Timeout validation
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout < 5 || config.timeout > 300) {
        errors.push('Timeout must be a number between 5 and 300 seconds');
      }
    }

    // Suggestions
    if (config.type === 'desktop') {
      const hasArgs = Array.isArray(config.args)
        ? config.args.length > 0
        : !!config.args && (config.args as string).trim().length > 0;

      if (!hasArgs) {
        suggestions.push('Consider adding arguments like "--port 3000" for local MCP servers');
      }
    }

    if (!config.healthCheck?.enabled) {
      suggestions.push('Consider enabling health checks for better reliability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  exportProviders(): string {
    const providers = Array.from(this.providers.values());
    return JSON.stringify(providers, null, 2);
  }

  async importProviders(data: string): Promise<void> {
    try {
      const providers = JSON.parse(data);
      if (!Array.isArray(providers)) {
        throw new Error('Import data must be an array of providers');
      }

      for (const provider of providers) {
        await this.addProvider(provider);
      }

      debug(`Imported ${providers.length} MCP providers`);
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug('Failed to import MCP providers:', {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
      });
      throw ErrorUtils.createError(
        `Failed to import MCP providers: ${hivemindError.message}`,
        'configuration',
        'MCP_PROVIDERS_IMPORT_FAILED',
        undefined,
        { originalError: hivemindError },
      );
    }
  }

  // Templates
  getTemplates(): MCPProviderTemplate[] {
    return [
      {
        id: 'filesystem-mcp',
        name: 'File System MCP',
        type: 'desktop',
        description: 'Local file system access for reading and writing files',
        category: 'File System',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        envVars: [
          {
            name: 'FILESYSTEM_ROOT',
            description: 'Root directory for file system access',
            required: true,
            defaultValue: '/tmp/mcp-files',
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
      },
      {
        id: 'web-scraper-mcp',
        name: 'Web Scraper MCP',
        type: 'desktop',
        description: 'Fetch and extract content from web pages',
        category: 'Web',
        command: 'npx',
        args: ['@modelcontextprotocol/server-web-scraper'],
        envVars: [],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/web-scraper',
      },
      {
        id: 'github-mcp',
        name: 'GitHub MCP',
        type: 'cloud',
        description: 'Access GitHub repositories, issues, and pull requests',
        category: 'Development',
        command: 'npx',
        args: ['@modelcontextprotocol/server-github'],
        envVars: [
          {
            name: 'GITHUB_TOKEN',
            description: 'GitHub personal access token',
            required: true,
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
      },
      {
        id: 'postgres-mcp',
        name: 'PostgreSQL MCP',
        type: 'desktop',
        description: 'Query PostgreSQL databases safely',
        category: 'Database',
        command: 'npx',
        args: ['@modelcontextprotocol/server-postgres'],
        envVars: [
          {
            name: 'POSTGRES_CONNECTION_STRING',
            description: 'PostgreSQL connection string',
            required: true,
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
      },
      {
        id: 'slack-mcp',
        name: 'Slack MCP',
        type: 'cloud',
        description: 'Send messages and access Slack workspace data',
        category: 'Communication',
        command: 'npx',
        args: ['@modelcontextprotocol/server-slack'],
        envVars: [
          {
            name: 'SLACK_TOKEN',
            description: 'Slack bot token',
            required: true,
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
      },
    ];
  }

  createFromTemplate(templateId: string, overrides: Partial<MCPProviderConfig>): MCPProviderConfig {
    const template = this.getTemplates().find(t => t.id === templateId);
    if (!template) {
      throw ErrorUtils.createError(
        `Template not found: ${templateId}`,
        'configuration',
        'MCP_TEMPLATE_NOT_FOUND',
        undefined,
        { templateId },
      );
    }

    const envVars: Record<string, string> = {};
    template.envVars.forEach(envVar => {
      envVars[envVar.name] = envVar.defaultValue || '';
    });

    const baseConfig: MCPProviderConfig = {
      id: uuidv4(),
      name: template.name,
      type: template.type,
      description: template.description,
      command: template.command,
      args: template.args,
      env: envVars,
      enabled: template.enabledByDefault,
      timeout: 30,
      autoRestart: true,
      healthCheck: {
        enabled: true,
        interval: 60,
        timeout: 10,
        retries: 3,
      },
    };

    return { ...baseConfig, ...overrides };
  }

  // Statistics
  getStats(): MCPProviderStats {
    const statuses = Array.from(this.statuses.values());
    const runningProviders = statuses.filter(s => s.status === 'running').length;
    const stoppedProviders = statuses.filter(s => s.status === 'stopped').length;
    const errorProviders = statuses.filter(s => s.status === 'error').length;

    return {
      totalProviders: this.providers.size,
      runningProviders,
      stoppedProviders,
      errorProviders,
      averageUptime: this.calculateAverageUptime(),
      totalMemoryUsage: this.calculateTotalMemoryUsage(),
      lastUpdated: new Date(),
    };
  }

  // Private methods
  private async executeProviderTest(provider: MCPProviderConfig): Promise<{
    success: boolean;
    error?: string;
    output?: string;
    version?: string;
    capabilities?: string[];
  }> {
    return new Promise((resolve) => {
      const timeout = provider.timeout || 30;
      const args = this.parseArgs(provider.args || '');

      const mcpProcess = spawn(provider.command, args, {
        env: { ...process.env, ...provider.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeout * 1000,
      });

      let output = '';
      let errorOutput = '';

      mcpProcess.stdout?.on('data', (data: any) => {
        output += data.toString();
      });

      mcpProcess.stderr?.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      mcpProcess.on('close', (code: any) => {
        if (code === 0) {
          // Try to extract version and capabilities from output
          const version = this.extractVersion(output);
          const capabilities = this.extractCapabilities(output);

          resolve({
            success: true,
            output: output.trim(),
            version,
            capabilities,
          });
        } else {
          resolve({
            success: false,
            error: `Process exited with code ${code}${errorOutput ? ': ' + errorOutput.trim() : ''}`,
          });
        }
      });

      mcpProcess.on('configuration', (error: any) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      // Kill process after timeout
      setTimeout(() => {
        if (mcpProcess && !mcpProcess.killed) {
          mcpProcess.kill();
          resolve({
            success: false,
            error: `Process timed out after ${timeout} seconds`,
          });
        }
      }, timeout * 1000);
    });
  }

  private async startProviderProcess(provider: MCPProviderConfig): Promise<ChildProcess> {
    const args = this.parseArgs(provider.args || '');

    const providerProcess = spawn(provider.command, args, {
      env: { ...process.env, ...provider.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
    });

    return new Promise((resolve, reject) => {
      const timeout = provider.timeout || 30;

      providerProcess.on('spawn', () => {
        resolve(providerProcess);
      });

      providerProcess.on('configuration', (error: any) => {
        reject(error);
      });

      providerProcess.on('close', (code: any) => {
        if (code !== 0) {
          reject(new Error(`MCP process exited with code ${code}`));
        }
      });

      // Timeout handling
      setTimeout(() => {
        if (providerProcess && !providerProcess.killed) {
          providerProcess.kill();
          reject(new Error(`MCP process failed to start within ${timeout} seconds`));
        }
      }, timeout * 1000);
    });
  }

  private parseArgs(args: string | string[]): string[] {
    if (Array.isArray(args)) {
      return args;
    }

    if (!args || (args as string).trim().length === 0) {
      return [];
    }

    try {
      // Try to parse as JSON
      return JSON.parse(args);
    } catch {
      // Parse as space-separated arguments
      return (args as string).trim().split(/\s+/);
    }
  }

  private extractVersion(output: string): string | undefined {
    // Look for version patterns in output
    const versionPatterns = [
      /version[:\s]+(\d+\.\d+\.\d+)/i,
      /v(\d+\.\d+\.\d+)/,
      /(\d+\.\d+\.\d+)/,
    ];

    for (const pattern of versionPatterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractCapabilities(output: string): string[] {
    // Look for capability patterns in MCP output
    const capabilities: string[] = [];

    // Common MCP capability indicators
    const capabilityPatterns = [
      /tools?:\s*([^\n]+)/i,
      /resources?:\s*([^\n]+)/i,
      /prompts?:\s*([^\n]+)/i,
    ];

    for (const pattern of capabilityPatterns) {
      const match = output.match(pattern);
      if (match) {
        capabilities.push(match[1].trim());
      }
    }

    return capabilities;
  }

  private startHealthCheck(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (!provider?.healthCheck?.enabled) {
      return;
    }

    const interval = provider.healthCheck.interval * 1000; // Convert to milliseconds

    const healthInterval = setInterval(() => {
      this.performHealthCheck(providerId);
    }, interval);

    this.healthCheckIntervals.set(providerId, healthInterval);
  }

  private stopHealthCheck(providerId: string): void {
    const interval = this.healthCheckIntervals.get(providerId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(providerId);
    }
  }

  private async performHealthCheck(providerId: string): Promise<void> {
    const process = this.processes.get(providerId);
    const status = this.statuses.get(providerId);
    const provider = this.providers.get(providerId);

    if (!process || !status || !provider) {
      return;
    }

    try {
      // Check if process is still running
      if (process.killed) {
        status.status = 'error';
        status.error = 'Process was killed';

        this.emit('provider_error', {
          type: 'provider_error',
          providerId,
          timestamp: new Date(),
          data: { error: 'Process was killed' },
        });

        // Auto-restart if enabled
        if (provider.autoRestart) {
          debug(`Auto-restarting MCP provider: ${provider.name} (${providerId})`);
          await this.restartProvider(providerId);
        }
      } else {
        // Update uptime
        if (status.uptime !== undefined && provider.healthCheck?.interval) {
          status.uptime += provider.healthCheck.interval;
        }
        status.lastCheck = new Date();
        status.error = undefined;
      }
    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error) as any;
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Health check failed for MCP provider ${providerId}:`, {
        error: hivemindError.message,
        errorCode: hivemindError.code,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        providerId,
      });
      status.status = 'error';
      status.error = hivemindError.message;
    }
  }

  private calculateAverageUptime(): number {
    const runningStatuses = Array.from(this.statuses.values())
      .filter(s => s.status === 'running' && s.uptime !== undefined);

    if (runningStatuses.length === 0) {
      return 0;
    }

    const totalUptime = runningStatuses.reduce((sum, status) => sum + (status.uptime || 0), 0);
    return totalUptime / runningStatuses.length;
  }

  private calculateTotalMemoryUsage(): number {
    // This would require actual memory monitoring implementation
    // For now, return 0 as a placeholder
    return 0;
  }
}

// Export singleton instance
export default new MCPProviderManager();