import { promises as fs } from 'fs';
import os from 'os';
import { performance } from 'perf_hooks';
import Logger from '@common/logger';

const logger = Logger.withContext('HealthChecker');

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    status: 'connected' | 'disconnected' | 'error';
    responseTime?: number;
  };
  services: Record<
    string,
    {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      message?: string;
    }
  >;
  metrics: {
    cpuUsage?: number;
    diskUsage?: number;
    activeConnections?: number;
    errorRate?: number;
    loadAverage1m?: number;
  };
}

export class HealthChecker {
  private startTime: number;
  private checkInterval: number;
  private lastCheckTime: number;
  private healthHistory: HealthCheckResult[];
  private maxHistory: number;
  private lastCpuUsage: NodeJS.CpuUsage;
  private lastCpuHrTime: bigint;

  constructor(checkInterval = 30000, maxHistory = 100) {
    this.startTime = performance.now();
    this.checkInterval = checkInterval;
    this.lastCheckTime = 0;
    this.healthHistory = [];
    this.maxHistory = maxHistory;
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuHrTime = process.hrtime.bigint();
  }

  public async performHealthCheck(): Promise<HealthCheckResult> {
    const now = performance.now();

    // Throttle health checks
    if (now - this.lastCheckTime < this.checkInterval) {
      const lastResult = this.healthHistory[this.healthHistory.length - 1];
      return lastResult || this.createEmptyHealthCheck();
    }

    this.lastCheckTime = now;

    try {
      const healthCheck: HealthCheckResult = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: now - this.startTime,
        memory: this.getMemoryUsage(),
        database: await this.checkDatabase(),
        services: await this.checkServices(),
        metrics: await this.collectMetrics(),
      };

      // Determine overall status
      healthCheck.status = this.determineOverallStatus(healthCheck);

      // Store in history
      this.healthHistory.push(healthCheck);
      if (this.healthHistory.length > this.maxHistory) {
        this.healthHistory.shift();
      }

      return healthCheck;
    } catch (error) {
      logger.error('Health check failed:', error);
      return this.createErrorHealthCheck(error);
    }
  }

  private getMemoryUsage() {
    const mem = process.memoryUsage();
    const used = mem.heapUsed;
    const total = mem.heapTotal;
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage,
    };
  }

  /**
   * Probe the process database manager when available. Does not fabricate a
   * "connected" result from a sleep timer — reports disconnected when the DB
   * has not been wired up for this process.
   */
  private async checkDatabase(): Promise<HealthCheckResult['database']> {
    try {
      const startTime = performance.now();
      // Lazy require to avoid hard coupling / circular imports at module load.
      const { DatabaseManager } = require('../database/DatabaseManager') as {
        DatabaseManager: {
          getInstance: () => { isConnected: () => boolean };
        };
      };
      const db = DatabaseManager.getInstance();
      const responseTime = Math.round(performance.now() - startTime);

      if (db.isConnected()) {
        return { status: 'connected', responseTime };
      }
      return { status: 'disconnected', responseTime };
    } catch (error) {
      logger.debug('Database health probe unavailable:', error);
      return { status: 'disconnected' };
    }
  }

  /**
   * Report only services we can probe without inventing "always up" sleep
   * placeholders. Event-loop latency is a real process signal; external
   * integrations are omitted until they have real probes.
   */
  private async checkServices(): Promise<HealthCheckResult['services']> {
    const services: HealthCheckResult['services'] = {};

    try {
      const startTime = performance.now();
      // Measure event-loop delay with a zero-delay timer (real scheduling lag).
      await new Promise<void>((resolve) => setImmediate(resolve));
      const responseTime = Math.round(performance.now() - startTime);

      services.eventLoop = {
        status: responseTime > 1000 ? 'degraded' : 'up',
        responseTime,
        message:
          responseTime > 1000 ? `Event-loop delay ${responseTime}ms exceeds 1000ms` : undefined,
      };
    } catch (error) {
      services.eventLoop = {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return services;
  }

  /**
   * Collect real OS / process metrics only. Never returns crypto-random or
   * other fabricated placeholder values for CPU, disk, connections, or errors.
   */
  private async collectMetrics(): Promise<HealthCheckResult['metrics']> {
    const metrics: HealthCheckResult['metrics'] = {};

    try {
      metrics.cpuUsage = this.calculateCpuUsage();
      metrics.loadAverage1m = os.loadavg()[0];

      const diskInfo = await this.getDiskUsage();
      if (diskInfo !== null) {
        metrics.diskUsage = diskInfo.percentage;
      }

      // Prefer live MetricsCollector counters when the singleton has been used;
      // otherwise omit rather than invent connection/error figures.
      try {
        const { MetricsCollector } = require('./MetricsCollector') as {
          MetricsCollector: {
            getInstance: () => {
              getMetrics: () => {
                activeConnections: number;
                errors: number;
                messagesProcessed: number;
              };
            };
          };
        };
        const m = MetricsCollector.getInstance().getMetrics();
        metrics.activeConnections = m.activeConnections;
        if (m.messagesProcessed > 0) {
          metrics.errorRate = Math.round((m.errors / m.messagesProcessed) * 1000) / 10;
        } else {
          metrics.errorRate = 0;
        }
      } catch {
        // MetricsCollector unavailable — leave activeConnections/errorRate unset.
      }
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }

    return metrics;
  }

  /**
   * Process CPU usage as a percentage of wall-clock time since the last sample.
   * Mirrors MetricsCollector.calculateCpuUsage — real process.cpuUsage delta.
   */
  private calculateCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const currentHrTime = process.hrtime.bigint();
    const elapsedHrTime = currentHrTime - this.lastCpuHrTime;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuHrTime = currentHrTime;

    const elapsedMs = Number(elapsedHrTime) / 1_000_000;
    if (elapsedMs <= 0) {
      return 0;
    }

    const userMs = currentCpuUsage.user / 1000;
    const systemMs = currentCpuUsage.system / 1000;
    const cpuPercent = (100 * (userMs + systemMs)) / elapsedMs;

    return Math.max(0, Math.min(100, Math.round(cpuPercent * 10) / 10));
  }

  /**
   * Real filesystem usage for the process working directory via fs.statfs.
   * Returns null when the platform call fails (metrics field is then omitted).
   */
  private async getDiskUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
  } | null> {
    try {
      const stats = await fs.statfs(process.cwd());
      const total = Number(stats.blocks) * Number(stats.bsize);
      const free = Number(stats.bfree) * Number(stats.bsize);
      if (total <= 0) {
        return null;
      }
      const used = total - free;
      const percentage = Math.round((used / total) * 1000) / 10;

      return {
        used: Math.round(used / 1024 / 1024),
        total: Math.round(total / 1024 / 1024),
        percentage: Math.max(0, Math.min(100, percentage)),
      };
    } catch (error) {
      logger.debug('Disk usage probe failed:', error);
      return null;
    }
  }

  private determineOverallStatus(
    healthCheck: HealthCheckResult
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Check for critical failures
    if (healthCheck.database.status === 'error') {
      return 'unhealthy';
    }

    // Check service statuses
    const downServices = Object.values(healthCheck.services).filter((s) => s.status === 'down');
    if (downServices.length >= 1) {
      return 'unhealthy';
    }

    // Check for degraded performance
    if (
      healthCheck.memory.percentage > 90 ||
      (healthCheck.metrics.diskUsage !== undefined && healthCheck.metrics.diskUsage > 90)
    ) {
      return 'degraded';
    }

    // Check response times
    const slowResponses = Object.values(healthCheck.services).filter(
      (s) => s.responseTime && s.responseTime > 1000
    );
    if (slowResponses.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  private createEmptyHealthCheck(): HealthCheckResult {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      memory: { used: 0, total: 0, percentage: 0 },
      database: { status: 'disconnected' },
      services: {},
      metrics: {},
    };
  }

  private createErrorHealthCheck(error: unknown): HealthCheckResult {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: performance.now() - this.startTime,
      memory: this.getMemoryUsage(),
      database: { status: 'error' },
      services: {
        healthChecker: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      metrics: {},
    };
  }

  public getHealthHistory(): HealthCheckResult[] {
    return [...this.healthHistory];
  }

  public getHealthTrends(): {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    statusDistribution: {
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    if (this.healthHistory.length === 0) {
      return {
        uptime: 0,
        averageResponseTime: 0,
        errorRate: 0,
        statusDistribution: { healthy: 0, degraded: 0, unhealthy: 0 },
      };
    }

    const totalChecks = this.healthHistory.length;
    const statusCounts = this.healthHistory.reduce(
      (acc, check) => {
        acc[check.status]++;
        return acc;
      },
      { healthy: 0, degraded: 0, unhealthy: 0 }
    );

    const responseTimes = this.healthHistory.flatMap((check) =>
      Object.values(check.services)
        .map((s) => s.responseTime || 0)
        .filter((t) => t > 0)
    );

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    return {
      uptime: this.healthHistory[this.healthHistory.length - 1]?.uptime || 0,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round((statusCounts.unhealthy / totalChecks) * 100),
      statusDistribution: {
        healthy: Math.round((statusCounts.healthy / totalChecks) * 100),
        degraded: Math.round((statusCounts.degraded / totalChecks) * 100),
        unhealthy: Math.round((statusCounts.unhealthy / totalChecks) * 100),
      },
    };
  }

  public async exportHealthData(): Promise<string> {
    const healthData = {
      timestamp: new Date().toISOString(),
      uptime: performance.now() - this.startTime,
      history: this.healthHistory,
      trends: this.getHealthTrends(),
    };

    return JSON.stringify(healthData, null, 2);
  }

  public async saveHealthReport(filePath: string): Promise<void> {
    const healthData = await this.exportHealthData();
    await fs.writeFile(filePath, healthData, 'utf-8');
  }

  /**
   * Gracefully shutdown the HealthChecker.
   * Clears health history and releases resources.
   */
  public shutdown(): void {
    this.healthHistory = [];
    this.lastCheckTime = 0;
    logger.info('💓 HealthChecker shutdown complete');
  }
}
