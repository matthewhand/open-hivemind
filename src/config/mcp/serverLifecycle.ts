import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import Debug from 'debug';
import { ErrorUtils } from '@src/types/errors';
import type { MCPProviderConfig, MCPProviderStatus, MCPProviderStats } from '../../types/mcp';
import { type EventEmitter } from 'events';

const debug = Debug('app:MCPProviderManager:ServerLifecycle');

export class ServerLifecycle {
  private processes = new Map<string, ChildProcess>();
  private statuses = new Map<string, MCPProviderStatus>();
  private healthCheckIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private providers: Map<string, MCPProviderConfig>,
    private emitter: EventEmitter
  ) {}

  public getStatuses(): Map<string, MCPProviderStatus> {
    return this.statuses;
  }

  public getStatus(id: string): MCPProviderStatus | null {
    return this.statuses.get(id) || null;
  }

  public getAllStatuses(): Record<string, MCPProviderStatus> {
    const result: Record<string, MCPProviderStatus> = {};
    this.statuses.forEach((status, id) => {
      result[id] = status;
    });
    return result;
  }

  public setStatus(id: string, status: MCPProviderStatus): void {
    this.statuses.set(id, status);
  }

  public deleteStatus(id: string): void {
    this.statuses.delete(id);
  }

  public hasProcess(id: string): boolean {
    return this.processes.has(id);
  }

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

      this.emitter.emit('provider_started', { type: 'provider_started', providerId: id, timestamp: new Date() });
      debug(`MCP provider started: ${provider.name} (${id})`);

    } catch (error: unknown) {
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      this.statuses.set(id, {
        id,
        status: 'error',
        lastCheck: new Date(),
        error: hivemindError.message,
      });

      debug(`Failed to start MCP provider: ${provider.name} (${id}) -`, {
        error: hivemindError.message,
        errorCode: ErrorUtils.getCode(hivemindError),
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        providerId: id,
      });

      this.emitter.emit('provider_error', {
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

    this.emitter.emit('provider_stopped', { type: 'provider_stopped', providerId: id, timestamp: new Date() });
    debug(`MCP provider stopped: ${provider.name} (${id})`);
  }

  async restartProvider(id: string): Promise<void> {
    debug(`Restarting MCP provider: ${id}`);
    await this.stopProvider(id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.startProvider(id);
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

  public parseArgs(args: string | string[]): string[] {
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
      debug(`Stopped health check for provider: ${providerId}`);
    }
  }

  public stopAllHealthChecks(): void {
    for (const [providerId, interval] of this.healthCheckIntervals.entries()) {
      clearInterval(interval);
      debug(`Stopped health check for provider: ${providerId}`);
    }
    this.healthCheckIntervals.clear();
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

        this.emitter.emit('provider_error', {
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
      const hivemindError = ErrorUtils.toHivemindError(error);
      const errorInfo = ErrorUtils.classifyError(hivemindError);
      debug(`Health check failed for MCP provider ${providerId}:`, {
        error: hivemindError.message,
        errorCode: ErrorUtils.getCode(hivemindError),
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        providerId,
      });
      status.status = 'error';
      status.error = hivemindError.message;
    }
  }

  public getStats(): MCPProviderStats {
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

  public async shutdown(): Promise<void> {
    this.stopAllHealthChecks();

    const stopPromises: Promise<void>[] = [];
    for (const providerId of this.processes.keys()) {
      stopPromises.push(
        this.stopProvider(providerId).catch((err) => {
          debug(`Error stopping provider ${providerId}:`, err);
        })
      );
    }

    await Promise.allSettled(stopPromises);
    this.processes.clear();
    this.statuses.clear();
  }
}
