import { EventEmitter } from 'events';
import {
  ProviderMetricsCollector,
  type ProviderStatus,
  type ProviderType,
} from './ProviderMetricsCollector';

/**
 * Integration types
 */
export type IntegrationType = 'discord' | 'slack' | 'mattermost' | 'llm' | 'mcp' | 'database';

/**
 * Anomaly severity
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Anomaly type
 */
export type AnomalyType =
  | 'response_time_spike'
  | 'error_rate_spike'
  | 'rate_limit_exceeded'
  | 'connection_failure'
  | 'message_drop'
  | 'authentication_failure'
  | 'latency_degradation'
  | 'token_usage_anomaly'
  | 'cost_anomaly'
  | 'availability_drop';

/**
 * Integration anomaly
 */
export interface IntegrationAnomaly {
  id: string;
  timestamp: number;
  integration: string;
  integrationType: IntegrationType;
  type: AnomalyType;
  severity: AnomalySeverity;
  message: string;
  value: number;
  expectedValue: number;
  deviation: number;
  metadata?: Record<string, any>;
}

/**
 * Detection threshold configuration
 */
export interface DetectionThreshold {
  type: AnomalyType;
  enabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  windowSize: number;
  minDataPoints: number;
}

/**
 * Integration anomaly detection configuration
 */
export interface IntegrationAnomalyConfig {
  enabled: boolean;
  checkInterval: number;
  thresholds: DetectionThreshold[];
}

/**
 * Default configuration for integration anomaly detection
 */
const DEFAULT_CONFIG: IntegrationAnomalyConfig = {
  enabled: true,
  checkInterval: 30000,
  thresholds: [
    {
      type: 'response_time_spike',
      enabled: true,
      warningThreshold: 2000,
      criticalThreshold: 5000,
      windowSize: 50,
      minDataPoints: 10,
    },
    {
      type: 'error_rate_spike',
      enabled: true,
      warningThreshold: 5,
      criticalThreshold: 20,
      windowSize: 50,
      minDataPoints: 10,
    },
    {
      type: 'rate_limit_exceeded',
      enabled: true,
      warningThreshold: 1,
      criticalThreshold: 5,
      windowSize: 100,
      minDataPoints: 5,
    },
    {
      type: 'connection_failure',
      enabled: true,
      warningThreshold: 1,
      criticalThreshold: 3,
      windowSize: 50,
      minDataPoints: 5,
    },
    {
      type: 'message_drop',
      enabled: true,
      warningThreshold: 5,
      criticalThreshold: 20,
      windowSize: 100,
      minDataPoints: 10,
    },
    {
      type: 'latency_degradation',
      enabled: true,
      warningThreshold: 1000,
      criticalThreshold: 3000,
      windowSize: 50,
      minDataPoints: 10,
    },
    {
      type: 'cost_anomaly',
      enabled: true,
      warningThreshold: 1.5,
      criticalThreshold: 3.0,
      windowSize: 100,
      minDataPoints: 20,
    },
    {
      type: 'availability_drop',
      enabled: true,
      warningThreshold: 95,
      criticalThreshold: 90,
      windowSize: 50,
      minDataPoints: 10,
    },
  ],
};

/**
 * IntegrationAnomalyDetector - Enhanced anomaly detection for Mattermost and other integrations
 */
export class IntegrationAnomalyDetector extends EventEmitter {
  private static instance: IntegrationAnomalyDetector;
  private config: IntegrationAnomalyConfig;
  private anomalies: Map<string, IntegrationAnomaly[]> = new Map();
  private dataWindows: Map<string, Map<string, number[]>> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private providerMetrics: ProviderMetricsCollector;

  private constructor(config: Partial<IntegrationAnomalyConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.providerMetrics = ProviderMetricsCollector.getInstance();
    this.initializeDataWindows();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<IntegrationAnomalyConfig>): IntegrationAnomalyDetector {
    if (!IntegrationAnomalyDetector.instance) {
      IntegrationAnomalyDetector.instance = new IntegrationAnomalyDetector(config);
    }
    return IntegrationAnomalyDetector.instance;
  }

  /**
   * Initialize data windows for each integration
   */
  private initializeDataWindows(): void {
    const integrations: IntegrationType[] = [
      'discord',
      'slack',
      'mattermost',
      'llm',
      'mcp',
      'database',
    ];
    const metrics = ['response_time', 'error_rate', 'latency', 'messages', 'cost'];

    for (const integration of integrations) {
      const integrationData = new Map<string, number[]>();
      for (const metric of metrics) {
        integrationData.set(metric, []);
      }
      this.dataWindows.set(integration, integrationData);
    }
  }

  /**
   * Start detection
   */
  startDetection(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.runDetection();
    }, this.config.checkInterval);

    this.emit('detectionStarted');
  }

  /**
   * Stop detection
   */
  stopDetection(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.emit('detectionStopped');
  }

  /**
   * Add data point for an integration
   */
  addDataPoint(
    integration: string,
    integrationType: IntegrationType,
    metric: string,
    value: number
  ): void {
    const typeData = this.dataWindows.get(integrationType);
    if (!typeData) return;

    const metricData = typeData.get(metric);
    if (!metricData) return;

    metricData.push(value);

    // Trim window
    const threshold = this.config.thresholds.find(
      (t) => t.type === `${metric}_spike` || t.type === `${metric}_degradation`
    );
    const windowSize = threshold?.windowSize || 50;
    if (metricData.length > windowSize) {
      metricData.shift();
    }

    this.emit('dataPoint', { integration, integrationType, metric, value });
  }

  /**
   * Run anomaly detection for all integrations
   */
  runDetection(): void {
    if (!this.config.enabled) return;

    this.detectForMattermost();
    this.detectForDiscord();
    this.detectForSlack();
    this.detectForLlmProviders();
    this.detectForMcp();
    this.detectForDatabase();
  }

  /**
   * Detect anomalies for Mattermost
   */
  private detectForMattermost(): void {
    const metrics = this.providerMetrics.getMessageProviderMetrics('mattermost');
    if (!metrics) return;

    // Response time spike
    if (metrics.averageResponseTime > 0) {
      this.checkThreshold(
        'mattermost',
        'mattermost',
        'response_time_spike',
        metrics.averageResponseTime,
        { response_time: metrics.averageResponseTime }
      );
    }

    // Error rate spike
    if (metrics.errorRate > 0) {
      this.checkThreshold('mattermost', 'mattermost', 'error_rate_spike', metrics.errorRate, {
        error_rate: metrics.errorRate,
      });
    }

    // Rate limit exceeded
    if (metrics.rateLimitHits > 0) {
      this.checkThreshold(
        'mattermost',
        'mattermost',
        'rate_limit_exceeded',
        metrics.rateLimitHits,
        { rate_limit_hits: metrics.rateLimitHits }
      );
    }

    // Availability drop
    if (metrics.status !== 'unknown') {
      const availability =
        metrics.status === 'healthy' ? 100 : metrics.status === 'degraded' ? 75 : 0;
      this.checkThreshold('mattermost', 'mattermost', 'availability_drop', 100 - availability, {
        availability,
      });
    }
  }

  /**
   * Detect anomalies for Discord
   */
  private detectForDiscord(): void {
    const metrics = this.providerMetrics.getMessageProviderMetrics('discord');
    if (!metrics) return;

    if (metrics.averageResponseTime > 0) {
      this.checkThreshold(
        'discord',
        'discord',
        'response_time_spike',
        metrics.averageResponseTime,
        { response_time: metrics.averageResponseTime }
      );
    }

    if (metrics.errorRate > 0) {
      this.checkThreshold('discord', 'discord', 'error_rate_spike', metrics.errorRate, {
        error_rate: metrics.errorRate,
      });
    }

    if (metrics.rateLimitHits > 0) {
      this.checkThreshold('discord', 'discord', 'rate_limit_exceeded', metrics.rateLimitHits, {
        rate_limit_hits: metrics.rateLimitHits,
      });
    }
  }

  /**
   * Detect anomalies for Slack
   */
  private detectForSlack(): void {
    const metrics = this.providerMetrics.getMessageProviderMetrics('slack');
    if (!metrics) return;

    if (metrics.averageResponseTime > 0) {
      this.checkThreshold('slack', 'slack', 'response_time_spike', metrics.averageResponseTime, {
        response_time: metrics.averageResponseTime,
      });
    }

    if (metrics.errorRate > 0) {
      this.checkThreshold('slack', 'slack', 'error_rate_spike', metrics.errorRate, {
        error_rate: metrics.errorRate,
      });
    }

    if (metrics.rateLimitHits > 0) {
      this.checkThreshold('slack', 'slack', 'rate_limit_exceeded', metrics.rateLimitHits, {
        rate_limit_hits: metrics.rateLimitHits,
      });
    }
  }

  /**
   * Detect anomalies for LLM providers
   */
  private detectForLlmProviders(): void {
    const llmProviders = [
      'openai',
      'flowise',
      'openwebui',
      'openswarm',
      'perplexity',
      'replicate',
      'n8n',
    ];

    for (const provider of llmProviders) {
      const metrics = this.providerMetrics.getLlmProviderMetrics(provider as ProviderType);
      if (!metrics) continue;

      // Latency degradation
      if (metrics.averageLatency > 0) {
        this.checkThreshold(provider, 'llm', 'latency_degradation', metrics.averageLatency, {
          latency: metrics.averageLatency,
        });
      }

      // Error rate spike
      if (metrics.errorRate > 0) {
        this.checkThreshold(provider, 'llm', 'error_rate_spike', metrics.errorRate, {
          error_rate: metrics.errorRate,
        });
      }

      // Cost anomaly
      if (metrics.averageCost > 0) {
        // Get historical average
        const costHistory = this.getDataWindow('llm', 'cost');
        if (costHistory.length >= 10) {
          const avgCost = costHistory.reduce((a, b) => a + b, 0) / costHistory.length;
          const deviation = metrics.averageCost / avgCost;
          this.checkThreshold(provider, 'llm', 'cost_anomaly', deviation, {
            cost: metrics.averageCost,
            avgCost,
            deviation,
          });
        }
      }

      // Rate limit exceeded
      if (metrics.rateLimitHits > 0) {
        this.checkThreshold(provider, 'llm', 'rate_limit_exceeded', metrics.rateLimitHits, {
          rate_limit_hits: metrics.rateLimitHits,
        });
      }
    }
  }

  /**
   * Detect anomalies for MCP
   */
  private detectForMcp(): void {
    // MCP metrics would come from MCPService
    // For now, emit event for external data
    this.emit('mcpAnomalyCheck');
  }

  /**
   * Detect anomalies for database
   */
  private detectForDatabase(): void {
    // Database metrics would come from DatabaseManager
    this.emit('databaseAnomalyCheck');
  }

  /**
   * Check threshold for anomaly
   */
  private checkThreshold(
    integration: string,
    integrationType: IntegrationType,
    type: AnomalyType,
    value: number,
    additionalData: Record<string, number>
  ): void {
    const threshold = this.config.thresholds.find((t) => t.type === type);
    if (!threshold || !threshold.enabled) return;

    // Calculate expected value (simple moving average)
    const window = this.getDataWindow(
      integrationType,
      type.replace('_spike', '').replace('_degradation', '')
    );
    const expectedValue = window.length > 0 ? window.reduce((a, b) => a + b, 0) / window.length : 0;

    let severity: AnomalySeverity = 'low';
    let triggered = false;

    if (threshold.criticalThreshold && value >= threshold.criticalThreshold) {
      severity = 'critical';
      triggered = true;
    } else if (threshold.warningThreshold && value >= threshold.warningThreshold) {
      severity = 'medium';
      triggered = true;
    }

    if (triggered) {
      const deviation = expectedValue > 0 ? value / expectedValue : value;

      const anomaly: IntegrationAnomaly = {
        id: `anomaly_${integration}_${type}_${Date.now()}`,
        timestamp: Date.now(),
        integration,
        integrationType,
        type,
        severity,
        message: this.generateAnomalyMessage(type, integration, value, expectedValue),
        value,
        expectedValue,
        deviation,
        metadata: additionalData,
      };

      this.addAnomaly(integration, anomaly);
      this.emit('anomalyDetected', anomaly);
    }

    // Add to data window
    this.addToDataWindow(
      integrationType,
      type.replace('_spike', '').replace('_degradation', ''),
      value
    );
  }

  /**
   * Generate human-readable anomaly message
   */
  private generateAnomalyMessage(
    type: AnomalyType,
    integration: string,
    value: number,
    expected: number
  ): string {
    const formattedValue = value.toFixed(2);
    const formattedExpected = expected.toFixed(2);

    switch (type) {
      case 'response_time_spike':
        return `Response time spike detected for ${integration}: ${formattedValue}ms (expected: ${formattedExpected}ms)`;
      case 'error_rate_spike':
        return `Error rate spike detected for ${integration}: ${formattedValue}%`;
      case 'rate_limit_exceeded':
        return `Rate limit exceeded for ${integration}: ${value} hits`;
      case 'connection_failure':
        return `Connection failures detected for ${integration}: ${value}`;
      case 'message_drop':
        return `Message drops detected for ${integration}: ${value}`;
      case 'latency_degradation':
        return `Latency degradation detected for ${integration}: ${formattedValue}ms`;
      case 'cost_anomaly':
        return `Cost anomaly detected for ${integration}: ${value.toFixed(1)}x normal`;
      case 'availability_drop':
        return `Availability drop detected for ${integration}: ${(100 - value).toFixed(1)}%`;
      default:
        return `Anomaly detected for ${integration}: ${type}`;
    }
  }

  /**
   * Get data window for integration type
   */
  private getDataWindow(integrationType: IntegrationType, metric: string): number[] {
    const typeData = this.dataWindows.get(integrationType);
    if (!typeData) return [];
    return typeData.get(metric) || [];
  }

  /**
   * Add to data window
   */
  private addToDataWindow(integrationType: IntegrationType, metric: string, value: number): void {
    const typeData = this.dataWindows.get(integrationType);
    if (!typeData) return;

    const metricData = typeData.get(metric);
    if (!metricData) {
      typeData.set(metric, [value]);
      return;
    }

    metricData.push(value);
    if (metricData.length > 100) {
      metricData.shift();
    }
  }

  /**
   * Add anomaly
   */
  private addAnomaly(integration: string, anomaly: IntegrationAnomaly): void {
    const existing = this.anomalies.get(integration) || [];
    existing.push(anomaly);

    // Keep only recent anomalies (last 100 per integration)
    if (existing.length > 100) {
      existing.shift();
    }

    this.anomalies.set(integration, existing);
  }

  /**
   * Get active anomalies
   */
  getActiveAnomalies(integration?: string): IntegrationAnomaly[] {
    if (integration) {
      return this.anomalies.get(integration) || [];
    }

    const all: IntegrationAnomaly[] = [];
    for (const anomalies of this.anomalies.values()) {
      all.push(...anomalies);
    }
    return all.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(minutes: number = 60, integration?: string): IntegrationAnomaly[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.getActiveAnomalies(integration).filter((a) => a.timestamp >= cutoff);
  }

  /**
   * Get anomaly summary
   */
  getAnomalySummary(): {
    total: number;
    bySeverity: Record<AnomalySeverity, number>;
    byIntegration: Record<string, number>;
    byType: Partial<Record<AnomalyType, number>>;
    recent: IntegrationAnomaly[];
  } {
    const anomalies = this.getActiveAnomalies();

    const bySeverity: Record<AnomalySeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    const byIntegration: Record<string, number> = {};
    const byType: Partial<Record<AnomalyType, number>> = {};

    for (const anomaly of anomalies) {
      bySeverity[anomaly.severity]++;
      byIntegration[anomaly.integration] = (byIntegration[anomaly.integration] || 0) + 1;
      byType[anomaly.type] = (byType[anomaly.type] || 0) + 1;
    }

    return {
      total: anomalies.length,
      bySeverity,
      byIntegration,
      byType,
      recent: anomalies.slice(0, 10),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<IntegrationAnomalyConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configUpdated', this.config);
  }

  /**
   * Set threshold for specific anomaly type
   */
  setThreshold(type: AnomalyType, warning: number, critical: number): void {
    const threshold = this.config.thresholds.find((t) => t.type === type);
    if (threshold) {
      threshold.warningThreshold = warning;
      threshold.criticalThreshold = critical;
    }
  }

  /**
   * Clear anomalies for an integration
   */
  clearAnomalies(integration?: string): void {
    if (integration) {
      this.anomalies.delete(integration);
    } else {
      this.anomalies.clear();
    }
  }
}

export default IntegrationAnomalyDetector;
