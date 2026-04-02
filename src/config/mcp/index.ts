import Debug from 'debug';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { injectable, singleton, inject } from 'tsyringe';
import { ErrorUtils } from '@src/types/errors';
import type {
  MCPProviderConfig,
  MCPProviderStatus,
  MCPProviderTestResult,
  MCPProviderTemplate,
  MCPProviderValidationResult,
  MCPProviderManager as IMCPProviderManager,
  MCPProviderStats,
} from '../../types/mcp';

import { ConfigLoader } from './configLoader';
import { ServerLifecycle } from './serverLifecycle';
import { ToolRegistry } from './toolRegistry';

const debug = Debug('app:MCPProviderManager');

@singleton()
@injectable()
export class MCPProviderManager extends EventEmitter implements IMCPProviderManager {
  private providers = new Map<string, MCPProviderConfig>();

  constructor(
    @inject(ConfigLoader) private configLoader: ConfigLoader,
    @inject(ServerLifecycle) private serverLifecycle: ServerLifecycle,
    @inject(ToolRegistry) private toolRegistry: ToolRegistry
  ) {
    super();
    this.serverLifecycle.initialize(this.providers, this);
    debug('MCP Provider Manager initialized');
  }

  // Core provider management
  async addProvider(config: MCPProviderConfig): Promise<void> {
    debug(`Adding MCP provider: ${config.name}`);

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
    this.serverLifecycle.setStatus(providerId, {
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
    if (this.serverLifecycle.hasProcess(id)) {
      await this.stopProvider(id);
    }

    this.providers.delete(id);
    this.serverLifecycle.deleteStatus(id);

    this.emit('provider_removed', { type: 'provider_removed', providerId: id, timestamp: new Date() });
    debug(`MCP provider removed: ${provider.name} (${id})`);
  }

  async updateProvider(id: string, config: Partial<MCPProviderConfig>): Promise<void> {
    debug(`Updating MCP provider: ${id}`);

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

  getServers() {
    return this.getAllProviders();
  }

  // Status and testing
  getProviderStatus(id: string): MCPProviderStatus | null {
    return this.serverLifecycle.getStatus(id);
  }

  getAllProviderStatuses(): Record<string, MCPProviderStatus> {
    return this.serverLifecycle.getAllStatuses();
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
      const result = await this.toolRegistry.executeProviderTest(
        provider,
        this.serverLifecycle.parseArgs.bind(this.serverLifecycle)
      );
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
      const hivemindError = ErrorUtils.toHivemindError(error);
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
        errorCode: ErrorUtils.getCode(hivemindError),
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        providerId: id,
      });
      return testResult;
    }
  }

  // Lifecycle management
  async startProvider(id: string): Promise<void> {
    return this.serverLifecycle.startProvider(id);
  }

  async stopProvider(id: string): Promise<void> {
    return this.serverLifecycle.stopProvider(id);
  }

  async restartProvider(id: string): Promise<void> {
    return this.serverLifecycle.restartProvider(id);
  }

  // Configuration
  validateProviderConfig(config: Partial<MCPProviderConfig>): MCPProviderValidationResult {
    return this.configLoader.validateProviderConfig(config);
  }

  exportServers(): string {
    return this.exportProviders();
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
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug('Failed to import MCP providers:', {
        error: hivemindError.message,
        errorCode: ErrorUtils.getCode(hivemindError),
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
    return this.toolRegistry.getTemplates();
  }

  createFromTemplate(templateId: string, overrides: Partial<MCPProviderConfig>): MCPProviderConfig {
    return this.toolRegistry.createFromTemplate(templateId, overrides);
  }

  // Statistics
  getStats(): MCPProviderStats {
    return this.serverLifecycle.getStats();
  }

  /**
   * Shutdown all providers and cleanup resources
   */
  public async shutdown(): Promise<void> {
    debug('Shutting down MCPProviderManager...');

    await this.serverLifecycle.shutdown();
    this.providers.clear();

    // Remove all event listeners
    this.removeAllListeners();

    debug('MCPProviderManager shutdown completed');
  }
}

// Export singleton instance with manual DI for non-container usage
export default new MCPProviderManager(
  new ConfigLoader(),
  new ServerLifecycle(),
  new ToolRegistry()
);