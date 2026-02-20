import type { HealthChecker, HealthCheckResult } from './HealthChecker';
import { EventEmitter } from 'events';

export interface AlertConfig {
  memoryThreshold: number; // percentage
  diskThreshold: number; // percentage
  responseTimeThreshold: number; // milliseconds
  errorRateThreshold: number; // percentage
  consecutiveFailures: number;
  cooldownPeriod: number; // milliseconds
}

export interface Alert {
  id: string;
  type: 'memory' | 'disk' | 'response_time' | 'error_rate' | 'service_down' | 'database_error';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface NotificationChannel {
  name: string;
  type: 'email' | 'webhook' | 'slack' | 'console';
  config: Record<string, any>;
  send: (alert: Alert) => Promise<boolean>;
}

export class AlertManager extends EventEmitter {
  private healthChecker: HealthChecker;
  private config: AlertConfig;
  private alerts: Map<string, Alert> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private failureCounts: Map<string, number> = new Map();
  private lastAlertTimes: Map<string, number> = new Map();
  private alertIdCounter: number = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(healthChecker: HealthChecker, config: Partial<AlertConfig> = {}) {
    super();
    this.healthChecker = healthChecker;

    this.config = {
      memoryThreshold: 85,
      diskThreshold: 90,
      responseTimeThreshold: 1000,
      errorRateThreshold: 5,
      consecutiveFailures: 3,
      cooldownPeriod: 300000, // 5 minutes
      ...config,
    };

    // Set up default console notification channel
    this.addNotificationChannel({
      name: 'console',
      type: 'console',
      config: {},
      send: async (alert: Alert) => {
        console.log(`🚨 ALERT [${alert.severity.toUpperCase()}] ${alert.title}`);
        console.log(`   ${alert.message}`);
        console.log(`   Value: ${alert.value} (Threshold: ${alert.threshold})`);
        return true;
      },
    });

    // Start monitoring
    this.startMonitoring();
  }

  public addNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.set(channel.name, channel);
    console.log(`📡 Added notification channel: ${channel.name} (${channel.type})`);
  }

  public removeNotificationChannel(name: string): void {
    this.notificationChannels.delete(name);
    console.log(`📡 Removed notification channel: ${name}`);
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      console.log(`✅ Alert acknowledged: ${alert.title}`);
      return true;
    }
    return false;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.emit('alertResolved', alert);
      console.log(`✅ Alert resolved: ${alert.title}`);
      return true;
    }
    return false;
  }

  public async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    message: string,
    value: number,
    threshold: number,
    metadata?: Record<string, any>,
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${++this.alertIdCounter}_${Date.now()}`,
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      value,
      threshold,
      acknowledged: false,
      resolved: false,
      metadata,
    };

    this.alerts.set(alert.id, alert);
    this.emit('alertCreated', alert);

    // Send notifications
    await this.sendNotifications(alert);

    return alert;
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    const notificationPromises = Array.from(this.notificationChannels.values())
      .map(channel => this.sendNotification(channel, alert));

    try {
      await Promise.allSettled(notificationPromises);
    } catch (error) {
      console.error('Failed to send notifications:', error);
    }
  }

  private async sendNotification(channel: NotificationChannel, alert: Alert): Promise<void> {
    try {
      const success = await channel.send(alert);
      if (success) {
        console.log(`📤 Notification sent via ${channel.name}`);
      } else {
        console.error(`❌ Failed to send notification via ${channel.name}`);
      }
    } catch (error) {
      console.error(`❌ Error sending notification via ${channel.name}:`, error);
    }
  }

  private async checkMemoryUsage(healthCheck: HealthCheckResult): Promise<void> {
    const { used, total, percentage } = healthCheck.memory;

    if (percentage > this.config.memoryThreshold) {
      const alertKey = 'memory_high';

      if (this.shouldTriggerAlert(alertKey)) {
        await this.createAlert(
          'memory',
          percentage > 95 ? 'critical' : 'warning',
          'High Memory Usage',
          `Memory usage is at ${percentage}% (${used}MB / ${total}MB)`,
          percentage,
          this.config.memoryThreshold,
          { used, total, process: process.pid },
        );
      }
    } else {
      this.resolveAlertsByType('memory');
    }
  }

  private async checkDiskUsage(healthCheck: HealthCheckResult): Promise<void> {
    const diskUsage = healthCheck.metrics.diskUsage;

    if (diskUsage && diskUsage > this.config.diskThreshold) {
      const alertKey = 'disk_high';

      if (this.shouldTriggerAlert(alertKey)) {
        await this.createAlert(
          'disk',
          diskUsage > 95 ? 'critical' : 'warning',
          'High Disk Usage',
          `Disk usage is at ${diskUsage}%`,
          diskUsage,
          this.config.diskThreshold,
          { diskUsage },
        );
      }
    } else {
      this.resolveAlertsByType('disk');
    }
  }

  private async checkResponseTimes(healthCheck: HealthCheckResult): Promise<void> {
    const slowServices = Object.entries(healthCheck.services)
      .filter(([, service]) => service.responseTime && service.responseTime > this.config.responseTimeThreshold);

    for (const [serviceName, service] of slowServices) {
      const alertKey = `response_time_${serviceName}`;

      if (this.shouldTriggerAlert(alertKey)) {
        await this.createAlert(
          'response_time',
          service.responseTime! > 2000 ? 'critical' : 'warning',
          `High Response Time - ${serviceName}`,
          `${serviceName} response time is ${service.responseTime}ms`,
          service.responseTime!,
          this.config.responseTimeThreshold,
          { serviceName, responseTime: service.responseTime },
        );
      }
    }
  }

  private async checkServiceStatus(healthCheck: HealthCheckResult): Promise<void> {
    for (const [serviceName, service] of Object.entries(healthCheck.services)) {
      if (service.status === 'down') {
        const alertKey = `service_down_${serviceName}`;

        if (this.shouldTriggerAlert(alertKey)) {
          await this.createAlert(
            'service_down',
            'critical',
            `Service Down - ${serviceName}`,
            `${serviceName} service is not responding`,
            0,
            0,
            { serviceName, error: service.message },
          );
        }
      } else {
        this.resolveAlertsByType('service_down', serviceName);
      }
    }
  }

  private async checkDatabaseStatus(healthCheck: HealthCheckResult): Promise<void> {
    if (healthCheck.database.status === 'error') {
      const alertKey = 'database_error';

      if (this.shouldTriggerAlert(alertKey)) {
        await this.createAlert(
          'database_error',
          'critical',
          'Database Connection Error',
          'Database connection is experiencing issues',
          0,
          0,
          { status: healthCheck.database.status },
        );
      }
    } else {
      this.resolveAlertsByType('database_error');
    }
  }

  private async checkErrorRate(healthCheck: HealthCheckResult): Promise<void> {
    const errorRate = healthCheck.metrics.errorRate;

    if (errorRate && errorRate > this.config.errorRateThreshold) {
      const alertKey = 'error_rate_high';

      if (this.shouldTriggerAlert(alertKey)) {
        await this.createAlert(
          'error_rate',
          errorRate > 10 ? 'critical' : 'warning',
          'High Error Rate',
          `Error rate is ${errorRate.toFixed(1)}%`,
          errorRate,
          this.config.errorRateThreshold,
          { errorRate },
        );
      }
    } else {
      this.resolveAlertsByType('error_rate');
    }
  }

  private shouldTriggerAlert(alertKey: string): boolean {
    const now = Date.now();
    const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;

    // Check cooldown period
    if (now - lastAlertTime < this.config.cooldownPeriod) {
      return false;
    }

    // Check consecutive failures
    const failureCount = this.failureCounts.get(alertKey) || 0;
    if (failureCount < this.config.consecutiveFailures) {
      return false;
    }

    return true;
  }

  private updateFailureCount(alertKey: string, failed: boolean): void {
    const currentCount = this.failureCounts.get(alertKey) || 0;

    if (failed) {
      this.failureCounts.set(alertKey, currentCount + 1);
    } else {
      this.failureCounts.set(alertKey, 0);
    }
  }

  private async startMonitoring(): Promise<void> {
    // Check health every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        const healthCheck = await this.healthChecker.performHealthCheck();
        await this.processHealthCheck(healthCheck);
      } catch (error) {
        console.error('Health monitoring failed:', error);
      }
    }, 30000);

    console.log('🔍 Health monitoring started');
  }

  private async processHealthCheck(healthCheck: HealthCheckResult): Promise<void> {
    // Update failure counts
    this.updateFailureCount('memory_high', healthCheck.memory.percentage > this.config.memoryThreshold);
    this.updateFailureCount('disk_high', (healthCheck.metrics.diskUsage || 0) > this.config.diskThreshold);
    this.updateFailureCount('database_error', healthCheck.database.status === 'error');

    // Check various metrics
    await this.checkMemoryUsage(healthCheck);
    await this.checkDiskUsage(healthCheck);
    await this.checkResponseTimes(healthCheck);
    await this.checkServiceStatus(healthCheck);
    await this.checkDatabaseStatus(healthCheck);
    await this.checkErrorRate(healthCheck);

    // Emit health check event
    this.emit('healthCheck', healthCheck);
  }

  private resolveAlertsByType(type: Alert['type'], serviceName?: string): void {
    const now = Date.now();

    for (const alert of this.alerts.values()) {
      if (!alert.resolved && alert.type === type) {
        if (!serviceName || alert.metadata?.serviceName === serviceName) {
          // Only resolve if the issue has been resolved for a while
          const lastAlertTime = this.lastAlertTimes.get(`${type}_${serviceName || ''}`) || 0;
          if (now - lastAlertTime > this.config.cooldownPeriod / 2) {
            this.resolveAlert(alert.id);
          }
        }
      }
    }
  }

  public async getAlertSummary(): Promise<{
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const alerts = this.getAllAlerts();

    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      resolved: alerts.filter(a => a.resolved).length,
      bySeverity,
      byType,
    };
  }

  public async exportAlertData(): Promise<string> {
    const alertSummary = await this.getAlertSummary();

    const alertData = {
      timestamp: new Date().toISOString(),
      config: this.config,
      alerts: this.getAllAlerts(),
      summary: alertSummary,
      channels: Array.from(this.notificationChannels.values()).map(c => ({
        name: c.name,
        type: c.type,
      })),
    };

    return JSON.stringify(alertData, null, 2);
  }

  /**
   * Gracefully shutdown the AlertManager.
   * Clears the monitoring interval and releases resources.
   */
  public shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔍 Health monitoring stopped');
    }
    
    // Clear all alerts
    this.alerts.clear();
    this.failureCounts.clear();
    this.lastAlertTimes.clear();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    console.log('✅ AlertManager shutdown complete');
  }
}