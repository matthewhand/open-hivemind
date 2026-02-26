import { promises as fs } from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { Request, Response } from 'express';

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
  };
}

export class HealthChecker {
  private startTime: number;
  private checkInterval: number;
  private lastCheckTime: number;
  private healthHistory: HealthCheckResult[];
  private maxHistory: number;

  constructor(checkInterval = 30000, maxHistory = 100) {
    this.startTime = performance.now();
    this.checkInterval = checkInterval;
    this.lastCheckTime = 0;
    this.healthHistory = [];
    this.maxHistory = maxHistory;
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
      console.error('Health check failed:', error);
      return this.createErrorHealthCheck(error);
    }
  }

  private getMemoryUsage() {
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal;
    const percentage = Math.round((used / total) * 100);

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage,
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult['database']> {
    try {
      const startTime = performance.now();
      // Placeholder for actual database check
      // In real implementation, this would ping the database
      await new Promise((resolve) => setTimeout(resolve, 10));
      const responseTime = performance.now() - startTime;

      return {
        status: 'connected',
        responseTime: Math.round(responseTime),
      };
    } catch (error) {
      return {
        status: 'error',
      };
    }
  }

  private async checkServices(): Promise<HealthCheckResult['services']> {
    const services: HealthCheckResult['services'] = {};

    // Check WebSocket service
    try {
      const startTime = performance.now();
      // Placeholder for WebSocket service check
      await new Promise((resolve) => setTimeout(resolve, 5));
      const responseTime = performance.now() - startTime;

      services.websocket = {
        status: 'up',
        responseTime: Math.round(responseTime),
      };
    } catch (error) {
      services.websocket = {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check LLM service
    try {
      const startTime = performance.now();
      // Placeholder for LLM service check
      await new Promise((resolve) => setTimeout(resolve, 15));
      const responseTime = performance.now() - startTime;

      services.llm = {
        status: 'up',
        responseTime: Math.round(responseTime),
      };
    } catch (error) {
      services.llm = {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check external integrations
    try {
      const startTime = performance.now();
      // Placeholder for external integrations check
      await new Promise((resolve) => setTimeout(resolve, 20));
      const responseTime = performance.now() - startTime;

      services.integrations = {
        status: 'up',
        responseTime: Math.round(responseTime),
      };
    } catch (error) {
      services.integrations = {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return services;
  }

  private async collectMetrics(): Promise<HealthCheckResult['metrics']> {
    const metrics: HealthCheckResult['metrics'] = {};

    try {
      // CPU Usage (placeholder - would need system-specific implementation)
      metrics.cpuUsage = Math.random() * 100; // Placeholder

      // Disk Usage
      const diskInfo = await this.getDiskUsage();
      metrics.diskUsage = diskInfo.percentage;

      // Active Connections (placeholder)
      metrics.activeConnections = Math.floor(Math.random() * 100);

      // Error Rate (placeholder)
      metrics.errorRate = Math.random() * 5;
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }

    return metrics;
  }

  private async getDiskUsage() {
    try {
      // Placeholder for disk usage check
      // In real implementation, this would check actual disk usage
      const used = Math.random() * 100;
      const total = 100;

      return {
        used: Math.round(used),
        total: Math.round(total),
        percentage: Math.round((used / total) * 100),
      };
    } catch (error) {
      return {
        used: 0,
        total: 100,
        percentage: 0,
      };
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
      (healthCheck.metrics.diskUsage && healthCheck.metrics.diskUsage > 90)
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

  private createErrorHealthCheck(error: any): HealthCheckResult {
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
    console.log('💓 HealthChecker shutdown complete');
  }
}
