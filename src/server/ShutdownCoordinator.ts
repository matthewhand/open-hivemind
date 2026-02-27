import type { Server as HttpServer } from 'http';
import Debug from 'debug';
import type { IMessengerService } from '@message/interfaces/IMessengerService';

const debug = Debug('app:ShutdownCoordinator');

/**
 * Shutdown phases enum.
 */
export enum ShutdownPhase {
  IDLE = 'idle',
  STOP_ACCEPTING = 'stopAccepting',
  DRAIN_REQUESTS = 'drainRequests',
  STOP_BACKGROUND = 'stopBackground',
  DISCONNECT_EXTERNAL = 'disconnectExternal',
  FINAL_CLEANUP = 'finalCleanup',
  COMPLETE = 'complete',
}

/**
 * Interface for services that can be shut down gracefully.
 */
export interface IShutdownable {
  shutdown(): Promise<void> | void;
  name?: string;
}

/**
 * Configuration for shutdown phases with timeouts.
 */
interface ShutdownPhaseConfig {
  name: string;
  timeout: number;
  description: string;
}

/**
 * Shutdown phase definitions with configurable timeouts.
 */
const DEFAULT_PHASE_CONFIGS: ShutdownPhaseConfig[] = [
  { name: 'stopAccepting', timeout: 5000, description: 'Stop accepting new connections' },
  { name: 'drainRequests', timeout: 10000, description: 'Drain in-flight requests' },
  { name: 'stopBackground', timeout: 5000, description: 'Stop background tasks' },
  { name: 'disconnectExternal', timeout: 15000, description: 'Disconnect external services' },
  { name: 'finalCleanup', timeout: 5000, description: 'Final cleanup' },
];

/**
 * Total maximum shutdown time in milliseconds.
 */
const DEFAULT_TOTAL_TIMEOUT = 40000;

/**
 * ShutdownCoordinator orchestrates graceful shutdown of all background services.
 *
 * Implements a 5-phase shutdown sequence:
 * 1. Stop accepting new connections
 * 2. Drain in-flight requests
 * 3. Stop background tasks
 * 4. Disconnect external services
 * 5. Final cleanup
 */
export class ShutdownCoordinator {
  private static instance: ShutdownCoordinator;

  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;
  private currentPhase: ShutdownPhase = ShutdownPhase.IDLE;
  private shutdownReason: string | null = null;

  // Resource references
  private httpServer: HttpServer | null = null;
  private viteServer: IShutdownable | null = null;
  private messengerServices: IMessengerService[] = [];
  private shutdownableServices: IShutdownable[] = [];

  // Phase configurations
  private phaseConfigs: ShutdownPhaseConfig[];
  private totalTimeout: number;

  // Shutdown state tracking
  private phaseResults = new Map<string, { success: boolean; duration: number; error?: Error }>();

  private constructor() {
    // Load timeouts from environment or use defaults
    this.phaseConfigs = DEFAULT_PHASE_CONFIGS.map((config) => ({
      ...config,
      timeout: this.getEnvTimeout(`SHUTDOWN_TIMEOUT_${config.name.toUpperCase()}`, config.timeout),
    }));

    this.totalTimeout = this.getEnvTimeout('SHUTDOWN_TIMEOUT_TOTAL', DEFAULT_TOTAL_TIMEOUT);
  }

  /**
   * Get the singleton instance of ShutdownCoordinator.
   */
  public static getInstance(): ShutdownCoordinator {
    if (!ShutdownCoordinator.instance) {
      ShutdownCoordinator.instance = new ShutdownCoordinator();
    }
    return ShutdownCoordinator.instance;
  }

  /**
   * Reset the singleton instance (for testing).
   */
  public static resetInstance(): void {
    ShutdownCoordinator.instance = undefined as any;
  }

  /**
   * Get timeout from environment variable or return default.
   */
  private getEnvTimeout(envVar: string, defaultMs: number): number {
    const envValue = process.env[envVar];
    if (envValue) {
      const parsed = parseInt(envValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return defaultMs;
  }

  /**
   * Register the HTTP server for graceful shutdown.
   */
  public registerHttpServer(server: HttpServer): void {
    this.httpServer = server;
    debug('HTTP server registered');
  }

  /**
   * Register the Vite dev server for graceful shutdown.
   */
  public registerViteServer(vite: IShutdownable): void {
    this.viteServer = vite;
    debug('Vite server registered');
  }

  /**
   * Register a messenger service for graceful shutdown.
   */
  public registerMessengerService(service: IMessengerService): void {
    this.messengerServices.push(service);
    debug(
      `Messenger service registered: ${(service as any).providerName || service.constructor?.name || 'unknown'}`
    );
  }

  /**
   * Register any shutdownable service.
   */
  public registerService(service: IShutdownable): void {
    this.shutdownableServices.push(service);
    debug(`Service registered: ${service.name || service.constructor?.name || 'unknown'}`);
  }

  /**
   * Check if shutdown is in progress.
   */
  public isShuttingDownNow(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Set up signal handlers for graceful shutdown.
   */
  public setupSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT'] as const;

    for (const signal of signals) {
      process.on(signal, () => {
        this.initiateShutdown(signal);
      });
    }

    // Handle unhandled rejections and exceptions
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled promise rejection:', { promise, reason });
      this.initiateShutdown('unhandledRejection', 1);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', { error });
      this.initiateShutdown('uncaughtException', 1);
    });

    debug('Signal handlers registered');
  }

  /**
   * Initiate graceful shutdown.
   * @param signal - The signal that triggered shutdown
   * @param exitCode - The exit code to use (default: 0)
   */
  public async initiateShutdown(signal: string, exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      debug(`Shutdown already in progress, ignoring signal: ${signal}`);
      return;
    }

    this.isShuttingDown = true;
    this.shutdownReason = signal;
    console.log(`\n🛑 Shutdown initiated by ${signal}`);
    console.log('⏱️  Starting graceful shutdown sequence...');

    // Ensure we exit within total timeout
    const forceExitTimer = setTimeout(() => {
      console.error('⚠️  Shutdown timed out, forcing exit');
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }, this.totalTimeout);

    try {
      await this.executeShutdownSequence();
      console.log('✅ Graceful shutdown completed successfully');
      clearTimeout(forceExitTimer);
      this.exitProcess(exitCode);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      clearTimeout(forceExitTimer);
      this.exitProcess(1);
    }
  }

  /**
   * Exit the process.
   * Extracted for testing purposes.
   */
  protected exitProcess(code: number): void {
    process.exit(code);
  }

  /**
   * Execute the complete shutdown sequence.
   */
  private async executeShutdownSequence(): Promise<void> {
    const startTime = Date.now();

    // Execute each phase in order
    for (const phaseConfig of this.phaseConfigs) {
      // Update current phase
      this.currentPhase = phaseConfig.name as ShutdownPhase;
      const phaseStart = Date.now();

      try {
        await this.executePhase(phaseConfig);
        const duration = Date.now() - phaseStart;
        this.phaseResults.set(phaseConfig.name, { success: true, duration });
        console.log(`  ✅ Phase '${phaseConfig.name}' completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - phaseStart;
        this.phaseResults.set(phaseConfig.name, {
          success: false,
          duration,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        console.error(`  ❌ Phase '${phaseConfig.name}' failed:`, error);
        // Continue with next phase even if one fails
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`\n📊 Shutdown completed in ${totalDuration}ms`);
    this.logPhaseSummary();
    this.currentPhase = ShutdownPhase.COMPLETE;
  }

  /**
   * Execute a single shutdown phase with timeout.
   */
  private async executePhase(config: ShutdownPhaseConfig): Promise<void> {
    debug(`Starting phase: ${config.name} (${config.timeout}ms timeout)`);

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Phase '${config.name}' timed out after ${config.timeout}ms`));
      }, config.timeout);

      this.runPhase(config.name)
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Run the actual work for each phase.
   */
  private async runPhase(phaseName: string): Promise<void> {
    switch (phaseName) {
      case 'stopAccepting':
        await this.phaseStopAccepting();
        break;
      case 'drainRequests':
        await this.phaseDrainRequests();
        break;
      case 'stopBackground':
        await this.phaseStopBackground();
        break;
      case 'disconnectExternal':
        await this.phaseDisconnectExternal();
        break;
      case 'finalCleanup':
        await this.phaseFinalCleanup();
        break;
      default:
        debug(`Unknown phase: ${phaseName}`);
    }
  }

  /**
   * Phase 1: Stop accepting new connections.
   */
  private async phaseStopAccepting(): Promise<void> {
    console.log('  📋 Phase 1: Stop accepting new connections');

    if (this.httpServer) {
      // Stop accepting new connections
      this.httpServer.close(() => {
        debug('HTTP server stopped accepting connections');
      });
    }

    if (this.viteServer) {
      try {
        await this.viteServer.shutdown();
        debug('Vite server stopped');
      } catch (error) {
        debug('Error stopping Vite server:', error);
      }
    }
  }

  /**
   * Phase 2: Drain in-flight requests.
   */
  private async phaseDrainRequests(): Promise<void> {
    console.log('  📋 Phase 2: Drain in-flight requests');

    // Close WebSocket connections
    const WebSocketService = require('@src/server/services/WebSocketService').default;
    const wsService = WebSocketService.getInstance();

    if (wsService && typeof wsService.shutdown === 'function') {
      try {
        await wsService.shutdown();
        debug('WebSocket service shut down');
      } catch (error) {
        debug('Error shutting down WebSocket service:', error);
      }
    }
  }

  /**
   * Phase 3: Stop background tasks.
   */
  private async phaseStopBackground(): Promise<void> {
    console.log('  📋 Phase 3: Stop background tasks');

    // Stop IdleResponseManager timers
    try {
      const { IdleResponseManager } = require('@message/management/IdleResponseManager');
      const idleManager = IdleResponseManager.getInstance();
      if (idleManager && typeof idleManager.clearAllChannels === 'function') {
        idleManager.clearAllChannels();
        debug('IdleResponseManager timers cleared');
      }
    } catch (error) {
      debug('Error clearing IdleResponseManager:', error);
    }

    // Stop all registered shutdownable services (background tasks)
    for (const service of this.shutdownableServices) {
      try {
        await service.shutdown();
        debug(`Service shut down: ${service.name || service.constructor?.name || 'unknown'}`);
      } catch (error) {
        debug(`Error shutting down service: ${service.name || 'unknown'}`, error);
      }
    }
  }

  /**
   * Phase 4: Disconnect external services.
   */
  private async phaseDisconnectExternal(): Promise<void> {
    console.log('  📋 Phase 4: Disconnect external services');

    // Disconnect messenger services in parallel
    const messengerShutdowns = this.messengerServices.map(async (service) => {
      try {
        if (typeof (service as any).shutdown === 'function') {
          await (service as any).shutdown();
          debug(
            `Messenger service shut down: ${(service as any).providerName || service.constructor?.name || 'unknown'}`
          );
        }
      } catch (error) {
        debug(
          `Error shutting down messenger service: ${(service as any).providerName || service.constructor?.name || 'unknown'}`,
          error
        );
      }
    });

    await Promise.allSettled(messengerShutdowns);

    // Disconnect MCP servers
    try {
      const { MCPService } = require('@src/mcp/MCPService');
      const mcpService = MCPService.getInstance();
      if (mcpService && typeof mcpService.disconnectAll === 'function') {
        await mcpService.disconnectAll();
        debug('MCP connections closed');
      }
    } catch (error) {
      debug('Error disconnecting MCP servers:', error);
    }

    // Close database connection
    try {
      const { DatabaseManager } = require('@src/database/DatabaseManager');
      const dbManager = DatabaseManager.getInstance();
      if (dbManager && typeof dbManager.disconnect === 'function') {
        await dbManager.disconnect();
        debug('Database connection closed');
      }
    } catch (error) {
      debug('Error disconnecting database:', error);
    }
  }

  /**
   * Phase 5: Final cleanup.
   */
  private async phaseFinalCleanup(): Promise<void> {
    console.log('  📋 Phase 5: Final cleanup');

    // Clear any remaining timers/intervals
    // This is a safety net - services should clean up their own timers

    // Clear singleton references
    this.messengerServices = [];
    this.shutdownableServices = [];
    this.httpServer = null;
    this.viteServer = null;

    debug('Final cleanup completed');
  }

  /**
   * Log a summary of all phases.
   */
  private logPhaseSummary(): void {
    console.log('\n📈 Phase Summary:');
    for (const [name, result] of this.phaseResults) {
      const status = result.success ? '✅' : '❌';
      console.log(
        `  ${status} ${name}: ${result.duration}ms${result.error ? ` (${result.error.message})` : ''}`
      );
    }
  }

  /**
   * Get the results of each shutdown phase (for testing/debugging).
   */
  public getPhaseResults(): Map<string, { success: boolean; duration: number; error?: Error }> {
    return new Map(this.phaseResults);
  }

  /**
   * Get the current shutdown phase.
   */
  public getCurrentPhase(): ShutdownPhase {
    return this.currentPhase;
  }

  /**
   * Get the reason for shutdown.
   */
  public getShutdownReason(): string | null {
    return this.shutdownReason;
  }
}

export default ShutdownCoordinator;
