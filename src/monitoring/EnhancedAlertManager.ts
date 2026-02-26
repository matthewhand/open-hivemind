import { EventEmitter } from 'events';
import { ProviderMetricsCollector, type ProviderType, type ProviderStatus } from './ProviderMetricsCollector';
import { BusinessKpiCollector } from './BusinessKpiCollector';
import { IntegrationAnomalyDetector, type IntegrationAnomaly, type AnomalySeverity } from './IntegrationAnomalyDetector';

/**
 * Alert level
 */
export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';

/**
 * Alert status
 */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

/**
 * Alert source
 */
export type AlertSource = 'provider' | 'kpi' | 'anomaly' | 'system' | 'custom';

/**
 * Configurable alert threshold
 */
export interface AlertThreshold {
  id: string;
  name: string;
  source: AlertSource;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'change';
  value: number;
  changePercent?: number;
  timeWindow?: number;
  enabled: boolean;
  cooldown: number;
  severity: AlertLevel;
  messageTemplate: string;
}

/**
 * Alert notification channel
 */
export interface AlertNotificationChannel {
  id: string;
  name: string;
  type: 'webhook' | 'email' | 'slack' | 'discord' | 'console';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Enhanced alert
 */
export interface EnhancedAlert {
  id: string;
  timestamp: number;
  level: AlertLevel;
  status: AlertStatus;
  source: AlertSource;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  metadata?: Record<string, any>;
}

/**
 * Alert statistics
 */
export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  byLevel: Record<AlertLevel, number>;
  bySource: Record<AlertSource, number>;
}

/**
 * Default alert thresholds
 */
const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  // Provider thresholds
  { id: 'provider_error_rate', name: 'High Error Rate', source: 'provider', metric: 'errorRate', condition: 'gt', value: 10, enabled: true, cooldown: 300000, severity: 'warning', messageTemplate: 'Error rate {{value}}% exceeds threshold {{threshold}}%' },
  { id: 'provider_critical_error', name: 'Critical Error Rate', source: 'provider', metric: 'errorRate', condition: 'gt', value: 50, enabled: true, cooldown: 60000, severity: 'critical', messageTemplate: 'Critical error rate {{value}}% detected' },
  { id: 'provider_latency', name: 'High Latency', source: 'provider', metric: 'responseTime', condition: 'gt', value: 5000, enabled: true, cooldown: 300000, severity: 'warning', messageTemplate: 'Response time {{value}}ms exceeds threshold' },
  { id: 'provider_unhealthy', name: 'Provider Unhealthy', source: 'provider', metric: 'status', condition: 'eq', value: 3, enabled: true, cooldown: 60000, severity: 'critical', messageTemplate: 'Provider {{metric}} is unhealthy' },
  { id: 'provider_rate_limit', name: 'Rate Limit Hit', source: 'provider', metric: 'rateLimitHits', condition: 'gt', value: 0, enabled: true, cooldown: 60000, severity: 'warning', messageTemplate: 'Rate limit hit for provider' },

  // LLM provider thresholds
  { id: 'llm_latency_high', name: 'High LLM Latency', source: 'provider', metric: 'latency', condition: 'gt', value: 30000, enabled: true, cooldown: 300000, severity: 'warning', messageTemplate: 'LLM latency {{value}}ms exceeds threshold' },
  { id: 'llm_cost_high', name: 'High LLM Cost', source: 'provider', metric: 'totalCost', condition: 'gt', value: 100, enabled: true, cooldown: 3600000, severity: 'warning', messageTemplate: 'LLM cost ${{value}} exceeds daily threshold' },
  { id: 'llm_error_rate', name: 'LLM Error Rate', source: 'provider', metric: 'llmErrorRate', condition: 'gt', value: 5, enabled: true, cooldown: 300000, severity: 'warning', messageTemplate: 'LLM error rate {{value}}% exceeds threshold' },

  // KPI thresholds
  { id: 'kpi_response_time', name: 'KPI Response Time', source: 'kpi', metric: 'average_response_time', condition: 'gt', value: 2000, enabled: true, cooldown: 300000, severity: 'warning', messageTemplate: 'Average response time exceeds target' },
  { id: 'kpi_success_rate', name: 'KPI Success Rate', source: 'kpi', metric: 'request_success_rate', condition: 'lt', value: 95, enabled: true, cooldown: 300000, severity: 'critical', messageTemplate: 'Request success rate below threshold' },
  { id: 'kpi_daily_spend', name: 'KPI Daily Spend', source: 'kpi', metric: 'daily_llm_spend', condition: 'gt', value: 100, enabled: true, cooldown: 3600000, severity: 'warning', messageTemplate: 'Daily LLM spend exceeds budget' },

  // System thresholds
  { id: 'system_memory', name: 'High Memory Usage', source: 'system', metric: 'memoryUsage', condition: 'gt', value: 90, enabled: true, cooldown: 300000, severity: 'warning', messageTemplate: 'Memory usage {{value}}% exceeds threshold' },
  { id: 'system_cpu', name: 'High CPU Usage', source: 'system', metric: 'cpuUsage', condition: 'gt', value: 90, enabled: true, cooldown: 300000, severity: 'warning', messageTemplate: 'CPU usage {{value}}% exceeds threshold' },
];

/**
 * EnhancedAlertManager - Alerting system with configurable thresholds
 */
export class EnhancedAlertManager extends EventEmitter {
  private static instance: EnhancedAlertManager;
  private alerts: Map<string, EnhancedAlert> = new Map();
  private thresholds: Map<string, AlertThreshold> = new Map();
  private notificationChannels: Map<string, AlertNotificationChannel> = new Map();
  private providerMetrics: ProviderMetricsCollector;
  private kpiCollector: BusinessKpiCollector;
  private anomalyDetector: IntegrationAnomalyDetector;
  private checkInterval: NodeJS.Timeout | null = null;
  private alertHistory: EnhancedAlert[] = [];
  private maxHistory: number = 10000;
  private idCounter: number = 0;

  private constructor() {
    super();
    this.providerMetrics = ProviderMetricsCollector.getInstance();
    this.kpiCollector = BusinessKpiCollector.getInstance();
    this.anomalyDetector = IntegrationAnomalyDetector.getInstance();
    this.initializeThresholds();
    this.setupEventListeners();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EnhancedAlertManager {
    if (!EnhancedAlertManager.instance) {
      EnhancedAlertManager.instance = new EnhancedAlertManager();
    }
    return EnhancedAlertManager.instance;
  }

  /**
   * Initialize default thresholds
   */
  private initializeThresholds(): void {
    for (const threshold of DEFAULT_THRESHOLDS) {
      this.thresholds.set(threshold.id, threshold);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for anomalies
    this.anomalyDetector.on('anomalyDetected', (anomaly: IntegrationAnomaly) => {
      this.handleAnomaly(anomaly);
    });
  }

  /**
   * Start alert monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkAllThresholds();
    }, intervalMs);

    this.emit('monitoringStarted');
  }

  /**
   * Stop alert monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.emit('monitoringStopped');
  }

  /**
   * Check all configured thresholds
   */
  private async checkAllThresholds(): Promise<void> {
    // Check provider thresholds
    await this.checkProviderThresholds();

    // Check KPI thresholds
    await this.checkKpiThresholds();

    // Check system thresholds
    this.checkSystemThresholds();
  }

  /**
   * Check provider thresholds
   */
  private async checkProviderThresholds(): Promise<void> {
    const messageProviders = this.providerMetrics.getAllMessageProviderMetrics();
    const llmProviders = this.providerMetrics.getAllLlmProviderMetrics();

    for (const provider of [...messageProviders, ...llmProviders]) {
      for (const [id, threshold] of this.thresholds) {
        if (threshold.source !== 'provider' || !threshold.enabled) continue;

        let value: number | undefined;
        let metricValue: number | undefined;

        if ('messagesReceived' in provider) {
          // Message provider
          switch (threshold.metric) {
            case 'errorRate':
              metricValue = provider.errorRate;
              value = provider.errorRate;
              break;
            case 'responseTime':
              metricValue = provider.averageResponseTime;
              value = provider.averageResponseTime;
              break;
            case 'rateLimitHits':
              metricValue = provider.rateLimitHits;
              value = provider.rateLimitHits;
              break;
            case 'status':
              metricValue = provider.status === 'healthy' ? 1 : provider.status === 'degraded' ? 2 : 3;
              value = metricValue;
              break;
          }
        } else {
          // LLM provider
          switch (threshold.metric) {
            case 'errorRate':
              metricValue = provider.errorRate;
              value = provider.errorRate;
              break;
            case 'latency':
              metricValue = provider.averageLatency;
              value = provider.averageLatency;
              break;
            case 'totalCost':
              metricValue = provider.totalCost;
              value = provider.totalCost;
              break;
            case 'llmErrorRate':
              metricValue = provider.errorRate;
              value = provider.errorRate;
              break;
          }
        }

        if (value !== undefined) {
          this.evaluateThreshold(threshold, value, { provider: provider.provider });
        }
      }
    }
  }

  /**
   * Check KPI thresholds
   */
  private async checkKpiThresholds(): Promise<void> {
    const kpis = this.kpiCollector.getAllKpis();

    for (const kpi of kpis) {
      for (const [id, threshold] of this.thresholds) {
        if (threshold.source !== 'kpi' || !threshold.enabled) continue;
        if (threshold.metric !== kpi.id) continue;

        this.evaluateThreshold(threshold, kpi.currentValue, { kpi: kpi.id });
      }
    }
  }

  /**
   * Check system thresholds
   */
  private checkSystemThresholds(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const memPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const cpuPercent = ((cpuUsage.user + cpuUsage.system) / 10000000) * 100;

    for (const [id, threshold] of this.thresholds) {
      if (threshold.source !== 'system' || !threshold.enabled) continue;

      if (threshold.metric === 'memoryUsage') {
        this.evaluateThreshold(threshold, memPercent);
      } else if (threshold.metric === 'cpuUsage') {
        this.evaluateThreshold(threshold, cpuPercent);
      }
    }
  }

  /**
   * Evaluate a threshold
   */
  private evaluateThreshold(threshold: AlertThreshold, value: number, context?: Record<string, any>): void {
    let triggered = false;

    switch (threshold.condition) {
      case 'gt':
        triggered = value > threshold.value;
        break;
      case 'lt':
        triggered = value < threshold.value;
        break;
      case 'eq':
        triggered = value === threshold.value;
        break;
      case 'gte':
        triggered = value >= threshold.value;
        break;
      case 'lte':
        triggered = value <= threshold.value;
        break;
      case 'change':
        if (threshold.changePercent) {
          triggered = Math.abs(value) > threshold.changePercent;
        }
        break;
    }

    if (triggered) {
      this.triggerAlert(threshold, value, context);
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(threshold: AlertThreshold, value: number, context?: Record<string, any>): void {
    // Check cooldown
    const recentAlert = Array.from(this.alerts.values())
      .filter(a => a.source === threshold.source && a.metric === threshold.metric)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (recentAlert && Date.now() - recentAlert.timestamp < threshold.cooldown) {
      return;
    }

    const id = `alert_${++this.idCounter}_${Date.now()}`;
    const message = threshold.messageTemplate
      .replace('{{value}}', value.toString())
      .replace('{{threshold}}', threshold.value.toString());

    const alert: EnhancedAlert = {
      id,
      timestamp: Date.now(),
      level: threshold.severity,
      status: 'active',
      source: threshold.source,
      title: threshold.name,
      message,
      metric: threshold.metric,
      value,
      threshold: threshold.value,
      metadata: context,
    };

    this.alerts.set(id, alert);
    this.alertHistory.push(alert);

    // Trim history
    if (this.alertHistory.length > this.maxHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistory);
    }

    this.sendNotifications(alert);
    this.emit('alertTriggered', alert);
  }

  /**
   * Handle anomaly detected
   */
  private handleAnomaly(anomaly: IntegrationAnomaly): void {
    const level: AlertLevel = anomaly.severity === 'critical' ? 'emergency' : 
                              anomaly.severity === 'high' ? 'critical' : 
                              anomaly.severity === 'medium' ? 'warning' : 'info';

    const id = `alert_anomaly_${++this.idCounter}_${Date.now()}`;
    const alert: EnhancedAlert = {
      id,
      timestamp: Date.now(),
      level,
      status: 'active',
      source: 'anomaly',
      title: `Anomaly: ${anomaly.type}`,
      message: anomaly.message,
      metric: anomaly.type,
      value: anomaly.value,
      threshold: anomaly.expectedValue,
      metadata: { integration: anomaly.integration, deviation: anomaly.deviation },
    };

    this.alerts.set(id, alert);
    this.alertHistory.push(alert);
    this.sendNotifications(alert);
    this.emit('alertTriggered', alert);
  }

  /**
   * Send notifications to all enabled channels
   */
  private sendNotifications(alert: EnhancedAlert): void {
    for (const channel of this.notificationChannels.values()) {
      if (!channel.enabled) continue;
      this.sendToChannel(channel, alert);
    }
  }

  /**
   * Send alert to specific channel
   */
  private sendToChannel(channel: AlertNotificationChannel, alert: EnhancedAlert): void {
    // Implementation depends on channel type
    switch (channel.type) {
      case 'console':
        console.log(`[ALERT ${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`);
        break;
      case 'slack':
      case 'discord':
      case 'webhook':
        // Would send to webhook
        this.emit('notification', { channel, alert });
        break;
    }
  }

  /**
   * Register a threshold
   */
  registerThreshold(threshold: AlertThreshold): void {
    this.thresholds.set(threshold.id, threshold);
    this.emit('thresholdRegistered', threshold);
  }

  /**
   * Update a threshold
   */
  updateThreshold(id: string, updates: Partial<AlertThreshold>): void {
    const threshold = this.thresholds.get(id);
    if (threshold) {
      Object.assign(threshold, updates);
      this.emit('thresholdUpdated', threshold);
    }
  }

  /**
   * Enable/disable a threshold
   */
  setThresholdEnabled(id: string, enabled: boolean): void {
    const threshold = this.thresholds.get(id);
    if (threshold) {
      threshold.enabled = enabled;
    }
  }

  /**
   * Register a notification channel
   */
  registerNotificationChannel(channel: AlertNotificationChannel): void {
    this.notificationChannels.set(channel.id, channel);
    this.emit('channelRegistered', channel);
  }

  /**
   * Get all alerts
   */
  getAlerts(status?: AlertStatus): EnhancedAlert[] {
    let alerts = Array.from(this.alerts.values());
    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): EnhancedAlert[] {
    return this.getAlerts('active');
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = Date.now();
      this.emit('alertAcknowledged', alert);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string): void {
    const alert = this.alerts.get(id);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());
    
    const byLevel: Record<AlertLevel, number> = { info: 0, warning: 0, critical: 0, emergency: 0 };
    const bySource: Record<AlertSource, number> = { provider: 0, kpi: 0, anomaly: 0, system: 0, custom: 0 };

    let active = 0, acknowledged = 0, resolved = 0;

    for (const alert of alerts) {
      byLevel[alert.level]++;
      bySource[alert.source]++;
      
      if (alert.status === 'active') active++;
      else if (alert.status === 'acknowledged') acknowledged++;
      else resolved++;
    }

    return {
      total: alerts.length,
      active,
      acknowledged,
      resolved,
      byLevel,
      bySource,
    };
  }

  /**
   * Get all thresholds
   */
  getThresholds(): AlertThreshold[] {
    return Array.from(this.thresholds.values());
  }

  /**
   * Create custom alert
   */
  createCustomAlert(level: AlertLevel, title: string, message: string, metadata?: Record<string, any>): void {
    const id = `alert_custom_${++this.idCounter}_${Date.now()}`;
    const alert: EnhancedAlert = {
      id,
      timestamp: Date.now(),
      level,
      status: 'active',
      source: 'custom',
      title,
      message,
      metadata,
    };

    this.alerts.set(id, alert);
    this.alertHistory.push(alert);
    this.sendNotifications(alert);
    this.emit('alertTriggered', alert);
  }
}

export default EnhancedAlertManager;
