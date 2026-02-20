import { HealthChecker } from './HealthChecker';
import type { AlertConfig, NotificationChannel } from './AlertManager';
import { AlertManager } from './AlertManager';
import { MetricsCollector } from './MetricsCollector';
import type { Request, Response, NextFunction } from 'express';

export interface MonitoringConfig {
  healthCheck: {
    enabled: boolean;
    interval: number;
    maxHistory: number;
  };
  alerts: {
    enabled: boolean;
    config: AlertConfig;
    channels: NotificationChannel[];
  };
  metrics: {
    enabled: boolean;
    interval: number;
    historySize: number;
  };
  endpoints: {
    health: string;
    metrics: string;
    alerts: string;
  };
}

export class MonitoringService {
  private healthChecker: HealthChecker;
  private alertManager: AlertManager;
  private metricsCollector: MetricsCollector;
  private config: MonitoringConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      healthCheck: {
        enabled: true,
        interval: 30000,
        maxHistory: 100,
        ...config.healthCheck,
      },
      alerts: {
        enabled: true,
        config: {
          memoryThreshold: 85,
          diskThreshold: 90,
          responseTimeThreshold: 1000,
          errorRateThreshold: 5,
          consecutiveFailures: 3,
          cooldownPeriod: 300000,
          ...config.alerts?.config,
        },
        channels: config.alerts?.channels || [],
      },
      metrics: {
        enabled: true,
        interval: 5000,
        historySize: 1000,
        ...config.metrics,
      },
      endpoints: {
        health: '/health',
        metrics: '/metrics',
        alerts: '/alerts',
        ...config.endpoints,
      },
      ...config,
    };

    // Initialize components
    this.healthChecker = new HealthChecker(
      this.config.healthCheck.interval,
      this.config.healthCheck.maxHistory,
    );

    this.alertManager = new AlertManager(
      this.healthChecker,
      this.config.alerts.config,
    );

    this.metricsCollector = MetricsCollector.getInstance();

    // Add notification channels
    this.config.alerts.channels.forEach(channel => {
      this.alertManager.addNotificationChannel(channel);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Health check events
    this.alertManager.on('healthCheck', (healthCheck) => {
      console.log(`💓 Health check completed: ${healthCheck.status}`);
    });

    // Alert events
    this.alertManager.on('alertCreated', (alert) => {
      console.log(`🚨 Alert created: ${alert.title} (${alert.severity})`);
    });

    this.alertManager.on('alertAcknowledged', (alert) => {
      console.log(`✅ Alert acknowledged: ${alert.title}`);
    });

    this.alertManager.on('alertResolved', (alert) => {
      console.log(`✅ Alert resolved: ${alert.title}`);
    });

    // Metrics events
    this.metricsCollector.on('metricRecorded', (data) => {
      // Optional: log specific metric events
      if (data.name === 'memory_percentage' && data.value > 80) {
        console.log(`⚠️ High memory usage: ${data.value}%`);
      }
    });

    this.metricsCollector.on('metricsCollected', (metrics) => {
      // Optional: process collected metrics
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Monitoring service already running');
      return;
    }

    console.log('🔧 Starting monitoring service...');

    try {
      // Start metrics collection
      if (this.config.metrics.enabled) {
        this.metricsCollector.startCollection();
        console.log('📊 Metrics collection started');
      }

      // Health checking is started automatically by AlertManager
      if (this.config.healthCheck.enabled) {
        console.log('💓 Health checking started');
      }

      this.isRunning = true;
      console.log('✅ Monitoring service started successfully');

      // Perform initial health check
      const initialHealth = await this.healthChecker.performHealthCheck();
      console.log(`🔍 Initial health status: ${initialHealth.status}`);

    } catch (error) {
      console.error('❌ Failed to start monitoring service:', error);
      throw error;
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('Monitoring service not running');
      return;
    }

    console.log('🔧 Stopping monitoring service...');

    try {
      // Stop metrics collection
      if (this.config.metrics.enabled) {
        this.metricsCollector.stopCollection();
        console.log('📊 Metrics collection stopped');
      }

      this.isRunning = false;
      console.log('✅ Monitoring service stopped');
    } catch (error) {
      console.error('❌ Error stopping monitoring service:', error);
    }
  }

  /**
   * Gracefully shutdown the MonitoringService and all its components.
   * This is more comprehensive than stop() - it shuts down all sub-components.
   */
  public shutdown(): void {
    console.log('🔧 Shutting down monitoring service...');

    // Stop the service first
    this.stop();

    // Shutdown sub-components
    if (this.alertManager) {
      this.alertManager.shutdown();
      console.log('🚨 AlertManager shutdown complete');
    }

    if (this.healthChecker) {
      this.healthChecker.shutdown();
      console.log('💓 HealthChecker shutdown complete');
    }

    if (this.metricsCollector) {
      this.metricsCollector.shutdown();
      console.log('📊 MetricsCollector shutdown complete');
    }

    console.log('✅ MonitoringService shutdown complete');
  }

  public getHealthMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const healthCheck = await this.healthChecker.performHealthCheck();

        res.status(healthCheck.status === 'healthy' ? 200 :
          healthCheck.status === 'degraded' ? 429 : 503)
          .json(healthCheck);
      } catch (error) {
        console.error('Health check endpoint error:', error);
        res.status(500).json({
          status: 'error',
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
  }

  public getMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const metrics = this.metricsCollector.getAllMetrics();
        const summary = this.metricsCollector.getMetricsSummary();

        res.json({
          timestamp: new Date().toISOString(),
          summary,
          metrics,
        });
      } catch (error) {
        console.error('Metrics endpoint error:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to retrieve metrics',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
  }

  public getAlertsMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const alerts = this.alertManager.getAllAlerts();
        const summary = await this.alertManager.getAlertSummary();

        res.json({
          timestamp: new Date().toISOString(),
          summary,
          alerts,
        });
      } catch (error) {
        console.error('Alerts endpoint error:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to retrieve alerts',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
  }

  public getAlertActionMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { alertId, action } = req.params;

        let result: boolean;
        switch (action) {
        case 'acknowledge':
          result = this.alertManager.acknowledgeAlert(alertId);
          break;
        case 'resolve':
          result = this.alertManager.resolveAlert(alertId);
          break;
        default:
          res.status(400).json({
            status: 'error',
            message: 'Invalid action. Use "acknowledge" or "resolve"',
          });
          return;
        }

        if (result) {
          res.json({
            status: 'success',
            message: `Alert ${action}d successfully`,
            alertId,
          });
        } else {
          res.status(404).json({
            status: 'error',
            message: 'Alert not found or already processed',
          });
        }
      } catch (error) {
        console.error('Alert action endpoint error:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to process alert action',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };
  }

  public getExpressMiddleware() {
    return [
      // Health check endpoint
      this.config.endpoints.health,
      this.getHealthMiddleware(),

      // Metrics endpoint
      this.config.endpoints.metrics,
      this.getMetricsMiddleware(),

      // Alerts endpoints
      this.config.endpoints.alerts,
      this.getAlertsMiddleware(),

      // Alert action endpoint
      `${this.config.endpoints.alerts}/:alertId/:action`,
      this.getAlertActionMiddleware(),
    ];
  }

  // Utility methods for application integration
  public recordRequest(): void {
    if (this.config.metrics.enabled) {
      this.metricsCollector.incrementRequestCount();
    }
  }

  public recordResponseTime(responseTime: number): void {
    if (this.config.metrics.enabled) {
      this.metricsCollector.recordResponseTime(responseTime);
    }
  }

  public recordError(): void {
    if (this.config.metrics.enabled) {
      this.metricsCollector.incrementErrorCount();
    }
  }

  public incrementActiveConnections(): void {
    if (this.config.metrics.enabled) {
      const current = this.metricsCollector.getLatestValue('app_active_connections') || 0;
      this.metricsCollector.recordMetric('app_active_connections', current + 1);
    }
  }

  public decrementActiveConnections(): void {
    if (this.config.metrics.enabled) {
      const current = this.metricsCollector.getLatestValue('app_active_connections') || 0;
      this.metricsCollector.recordMetric('app_active_connections', Math.max(0, current - 1));
    }
  }

  // Data export methods
  public async exportMonitoringData(): Promise<string> {
    const healthData = await this.healthChecker.exportHealthData();
    const metricsData = await this.metricsCollector.exportMetricsData();
    const alertData = await this.alertManager.exportAlertData();

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      health: JSON.parse(healthData),
      metrics: JSON.parse(metricsData),
      alerts: JSON.parse(alertData),
    }, null, 2);
  }

  public async saveMonitoringReport(filePath: string): Promise<void> {
    const monitoringData = await this.exportMonitoringData();
    const { promises: fs } = await import('fs');
    await fs.writeFile(filePath, monitoringData, 'utf-8');
  }

  // Getters for accessing monitoring components
  public getHealthChecker(): HealthChecker {
    return this.healthChecker;
  }

  public getAlertManager(): AlertManager {
    return this.alertManager;
  }

  public getMetricsCollector(): MetricsCollector {
    return this.metricsCollector;
  }

  public getStatus(): {
    isRunning: boolean;
    config: MonitoringConfig;
    health: any;
    alerts: any;
    metrics: any;
    } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      health: {
        historyLength: this.healthChecker.getHealthHistory().length,
      },
      alerts: {
        activeCount: this.alertManager.getActiveAlerts().length,
        totalCount: this.alertManager.getAllAlerts().length,
      },
      metrics: {
        summary: this.metricsCollector.getMetricsSummary(),
      },
    };
  }
}