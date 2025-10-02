import Debug from 'debug';
import { EventEmitter } from 'events';
import * as os from 'os';
// import * as fs from 'fs';
// import * as path from 'path';

const debug = Debug('app:AdvancedMonitor');

interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    used: number;
    total: number;
    free: number;
    usagePercent: number;
  }[];
  network: {
    interfaces: string[];
    bytesReceived: number;
    bytesTransmitted: number;
  };
  process: {
    pid: number;
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

interface ApplicationMetrics {
  timestamp: number;
  activeConnections: number;
  totalRequests: number;
  errorCount: number;
  responseTime: {
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  botMetrics: {
    totalBots: number;
    activeBots: number;
    messagesProcessed: number;
    commandsExecuted: number;
  };
  llmMetrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    tokensUsed: number;
  };
}

interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime?: number;
      lastCheck: number;
      error?: string;
    };
  };
  alerts: Alert[];
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
}

export class AdvancedMonitor extends EventEmitter {
  private static instance: AdvancedMonitor;
  private metricsInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private alerts: Alert[] = [];
  private isMonitoring = false;

  // Configuration
  private readonly METRICS_RETENTION_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly METRICS_COLLECTION_INTERVAL = 10000; // 10 seconds
  private readonly MAX_METRICS_HISTORY = 1000;

  private constructor() {
    super();
    this.setupEventHandlers();
  }

  public static getInstance(): AdvancedMonitor {
    if (!AdvancedMonitor.instance) {
      AdvancedMonitor.instance = new AdvancedMonitor();
    }
    return AdvancedMonitor.instance;
  }

  private setupEventHandlers(): void {
    this.on('alert', (alert: Alert) => {
      debug(`Alert triggered: ${alert.severity} - ${alert.message}`);
      this.alerts.push(alert);

      // Keep only recent alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-50);
      }
    });

    this.on('health-check', (status: HealthStatus) => {
      debug(`Health check completed: ${status.overall}`);
    });
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      debug('Monitoring already running');
      return;
    }

    debug('Starting advanced monitoring system');
    this.isMonitoring = true;

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectApplicationMetrics();
    }, this.METRICS_COLLECTION_INTERVAL);

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    // Initial collection
    this.collectSystemMetrics();
    this.collectApplicationMetrics();
    this.performHealthChecks();
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    debug('Stopping advanced monitoring system');
    this.isMonitoring = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private collectSystemMetrics(): void {
    try {
      const timestamp = Date.now();

      // CPU metrics
      const cpuUsage = process.cpuUsage();
      const loadAverage = os.loadavg();

      // Memory metrics
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // Disk metrics
      const diskMetrics = this.getDiskMetrics();

      // Network metrics
      const networkInterfaces = os.networkInterfaces();
      const networkStats = this.getNetworkStats();

      // Process metrics
      const processMetrics = {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage
      };

      const metrics: SystemMetrics = {
        timestamp,
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          loadAverage,
          cores: os.cpus().length
        },
        memory: {
          used: usedMemory,
          total: totalMemory,
          free: freeMemory,
          usagePercent: (usedMemory / totalMemory) * 100
        },
        disk: diskMetrics,
        network: {
          interfaces: Object.keys(networkInterfaces),
          bytesReceived: networkStats.rx,
          bytesTransmitted: networkStats.tx
        },
        process: processMetrics
      };

      this.systemMetrics.push(metrics);

      // Maintain history limit
      if (this.systemMetrics.length > this.MAX_METRICS_HISTORY) {
        this.systemMetrics.shift();
      }

      this.emit('system-metrics', metrics);

      // Check for alerts
      this.checkSystemAlerts(metrics);

    } catch (error) {
      debug('Error collecting system metrics:', error);
    }
  }

  private collectApplicationMetrics(): void {
    try {
      const timestamp = Date.now();

      // This would be populated by other services
      // For now, we'll create a basic structure
      const metrics: ApplicationMetrics = {
        timestamp,
        activeConnections: 0, // Would be populated by WebSocket service
        totalRequests: 0, // Would be populated by API routes
        errorCount: 0, // Would be populated by error handlers
        responseTime: {
          avg: 0,
          min: 0,
          max: 0,
          p95: 0,
          p99: 0
        },
        botMetrics: {
          totalBots: 0, // Would be populated by BotConfigurationManager
          activeBots: 0,
          messagesProcessed: 0,
          commandsExecuted: 0
        },
        llmMetrics: {
          totalRequests: 0, // Would be populated by LLM providers
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          tokensUsed: 0
        }
      };

      this.applicationMetrics.push(metrics);

      // Maintain history limit
      if (this.applicationMetrics.length > this.MAX_METRICS_HISTORY) {
        this.applicationMetrics.shift();
      }

      this.emit('application-metrics', metrics);

    } catch (error) {
      debug('Error collecting application metrics:', error);
    }
  }

  private performHealthChecks(): void {
    const healthStatus: HealthStatus = {
      overall: 'healthy',
      services: {},
      alerts: this.alerts.filter(a => !a.resolved)
    };

    // Check system health
    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (latestSystemMetrics) {
      // Memory usage check
      if (latestSystemMetrics.memory.usagePercent > 90) {
        healthStatus.overall = 'unhealthy';
        this.emit('alert', {
          id: `memory-high-${Date.now()}`,
          severity: 'high',
          message: `High memory usage: ${latestSystemMetrics.memory.usagePercent.toFixed(1)}%`,
          timestamp: Date.now(),
          resolved: false
        });
      } else if (latestSystemMetrics.memory.usagePercent > 80) {
        healthStatus.overall = healthStatus.overall === 'unhealthy' ? 'unhealthy' : 'degraded';
        this.emit('alert', {
          id: `memory-warning-${Date.now()}`,
          severity: 'medium',
          message: `Elevated memory usage: ${latestSystemMetrics.memory.usagePercent.toFixed(1)}%`,
          timestamp: Date.now(),
          resolved: false
        });
      }

      // CPU usage check
      if (latestSystemMetrics.cpu.usage > 90) {
        healthStatus.overall = 'unhealthy';
        this.emit('alert', {
          id: `cpu-high-${Date.now()}`,
          severity: 'high',
          message: `High CPU usage: ${latestSystemMetrics.cpu.usage.toFixed(1)}%`,
          timestamp: Date.now(),
          resolved: false
        });
      }
    }

    // Service health checks would be added here
    // For example: database connectivity, external API availability, etc.

    healthStatus.services = {
      'system': {
        status: healthStatus.overall === 'healthy' ? 'up' : 'degraded',
        lastCheck: Date.now()
      },
      'monitoring': {
        status: 'up',
        lastCheck: Date.now()
      }
    };

    this.emit('health-check', healthStatus);
  }

  private checkSystemAlerts(metrics: SystemMetrics): void {
    // Memory alerts
    if (metrics.memory.usagePercent > 95) {
      this.emit('alert', {
        id: `memory-critical-${Date.now()}`,
        severity: 'critical',
        message: `Critical memory usage: ${metrics.memory.usagePercent.toFixed(1)}%`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    // CPU alerts
    if (metrics.cpu.usage > 95) {
      this.emit('alert', {
        id: `cpu-critical-${Date.now()}`,
        severity: 'critical',
        message: `Critical CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: Date.now(),
        resolved: false
      });
    }
  }

  private getDiskMetrics(): SystemMetrics['disk'] {
    try {
      // Get disk usage for the current directory
      // const stats = fs.statSync('.');
      const diskUsage = this.getDiskUsage(process.cwd());

      return [{
        used: diskUsage.used,
        total: diskUsage.total,
        free: diskUsage.free,
        usagePercent: diskUsage.usagePercent
      }];
    } catch (error) {
      debug('Error getting disk metrics:', error);
      return [{
        used: 0,
        total: 0,
        free: 0,
        usagePercent: 0
      }];
    }
  }

  private getDiskUsage(): { used: number; total: number; free: number; usagePercent: number } {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd use a library like 'diskusage' or 'systeminformation'
      return {
        used: 0, // Placeholder
        total: 100 * 1024 * 1024 * 1024, // 100GB placeholder
        free: 50 * 1024 * 1024 * 1024, // 50GB placeholder
        usagePercent: 50
      };
    } catch {
      return {
        used: 0,
        total: 0,
        free: 0,
        usagePercent: 0
      };
    }
  }

  private getNetworkStats(): { rx: number; tx: number } {
    // This is a simplified implementation
    // In a real scenario, you'd use a library to get actual network statistics
    return {
      rx: Math.floor(Math.random() * 1000000),
      tx: Math.floor(Math.random() * 1000000)
    };
  }

  // Public API methods
  public getSystemMetrics(limit = 100): SystemMetrics[] {
    return this.systemMetrics.slice(-limit);
  }

  public getApplicationMetrics(limit = 100): ApplicationMetrics[] {
    return this.applicationMetrics.slice(-limit);
  }

  public getHealthStatus(): HealthStatus {
    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    const overall: 'healthy' | 'degraded' | 'unhealthy' =
      latestSystemMetrics &&
      (latestSystemMetrics.memory.usagePercent > 90 || latestSystemMetrics.cpu.usage > 90)
        ? 'unhealthy'
        : latestSystemMetrics &&
          (latestSystemMetrics.memory.usagePercent > 80 || latestSystemMetrics.cpu.usage > 80)
        ? 'degraded'
        : 'healthy';

    return {
      overall,
      services: {
        'system': {
          status: overall === 'healthy' ? 'up' : 'degraded',
          lastCheck: Date.now()
        },
        'monitoring': {
          status: 'up',
          lastCheck: Date.now()
        }
      },
      alerts: this.alerts.filter(a => !a.resolved)
    };
  }

  public getAlerts(activeOnly = true): Alert[] {
    return activeOnly
      ? this.alerts.filter(a => !a.resolved)
      : this.alerts;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      debug(`Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  public getMetricsSummary(): {
    system: Partial<SystemMetrics>;
    application: Partial<ApplicationMetrics>;
    health: HealthStatus;
  } {
    const latestSystem = this.systemMetrics[this.systemMetrics.length - 1];
    const latestApplication = this.applicationMetrics[this.applicationMetrics.length - 1];

    return {
      system: latestSystem ? {
        timestamp: latestSystem.timestamp,
        cpu: latestSystem.cpu,
        memory: latestSystem.memory
      } : {},
      application: latestApplication ? {
        timestamp: latestApplication.timestamp,
        activeConnections: latestApplication.activeConnections,
        botMetrics: latestApplication.botMetrics
      } : {},
      health: this.getHealthStatus()
    };
  }

  public cleanup(): void {
    // Clean up old metrics
    const cutoffTime = Date.now() - this.METRICS_RETENTION_PERIOD;

    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoffTime);
    this.applicationMetrics = this.applicationMetrics.filter(m => m.timestamp > cutoffTime);

    // Clean up old resolved alerts
    this.alerts = this.alerts.filter(a => !a.resolved || (a.resolvedAt && a.resolvedAt > cutoffTime));

    debug('Monitoring data cleanup completed');
  }
}

export default AdvancedMonitor;