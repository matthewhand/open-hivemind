import { EventEmitter } from 'events';
import Debug from 'debug';
import { DatabaseManager, type Anomaly } from '../database/DatabaseManager';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { WebSocketService, type AlertEvent } from '../server/services/WebSocketService';

const debug = Debug('app:AnomalyDetectionService');

export interface DetectionConfig {
  enabled: boolean;
  windowSize: number; // Number of data points for rolling window
  zThreshold: number; // Default 3 for 99.7% confidence
  metricsToMonitor: string[]; // e.g., ['responseTime', 'errorRate']
  minDataPoints: number; // Minimum points needed for calculation
}

export class AnomalyDetectionService extends EventEmitter {
  private static instance: AnomalyDetectionService;
  private config: DetectionConfig = {
    enabled: true,
    windowSize: 50,
    zThreshold: 3,
    metricsToMonitor: ['responseTime', 'errors'],
    minDataPoints: 10,
  };
  private dataWindows = new Map<string, number[]>(); // metric -> rolling data points
  private anomalies: Anomaly[] = [];
  private isDetecting = false;

  private constructor() {
    super();
    this.setMaxListeners(15);
    // Start periodic detection
    setInterval(() => this.runDetection(), 30000); // Every 30 seconds
  }

  static getInstance(): AnomalyDetectionService {
    if (!AnomalyDetectionService.instance) {
      AnomalyDetectionService.instance = new AnomalyDetectionService();
    }
    return AnomalyDetectionService.instance;
  }

  updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    debug('Anomaly detection config updated');
  }

  addDataPoint(metric: string, value: number): void {
    if (!this.config.enabled || !this.config.metricsToMonitor.includes(metric)) {
      return;
    }

    const window = this.dataWindows.get(metric) || [];
    window.push(value);
    if (window.length > this.config.windowSize) {
      window.shift();
    }
    this.dataWindows.set(metric, window);

    debug(`Added data point for ${metric}: ${value}`);
    this.emit('dataPointAdded', { metric, value });
  }

  async runDetection(): Promise<void> {
    if (!this.config.enabled || this.isDetecting) {
      return;
    }

    this.isDetecting = true;
    debug('Running anomaly detection');

    try {
      const dbManager = DatabaseManager.getInstance();
      const storePromises: Promise<void>[] = [];

      for (const [metric, window] of this.dataWindows.entries()) {
        if (window.length < this.config.minDataPoints) {
          continue;
        }

        const { mean, stdDev } = this.calculateStats(window);
        const recentValue = window[window.length - 1];
        const zScore = Math.abs((recentValue - mean) / stdDev);

        if (zScore > this.config.zThreshold) {
          const anomaly = this.createAnomaly(metric, recentValue, mean, stdDev, zScore);
          this.anomalies.push(anomaly);
          this.emit('anomalyDetected', anomaly);

          // Store in database
          storePromises.push(
            dbManager.storeAnomaly(anomaly).catch((err) => {
              debug('Failed to store anomaly:', err);
            })
          );

          // Broadcast via WebSocket
          const wsService = WebSocketService.getInstance();
          const alert: Omit<
            AlertEvent,
            'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'
          > = {
            level:
              anomaly.severity === 'critical'
                ? 'critical'
                : anomaly.severity === 'high'
                  ? 'error'
                  : 'warning',
            title: `Anomaly Detected: ${anomaly.metric}`,
            message: anomaly.explanation,
            metadata: {
              anomalyId: anomaly.id,
              zScore: anomaly.zScore,
              value: anomaly.value,
              expected: anomaly.expectedMean,
            },
          };
          wsService.recordAlert(alert);

          debug(`Anomaly detected in ${metric}: z-score ${zScore.toFixed(2)}`);
        }
      }

      await Promise.all(storePromises);
    } finally {
      this.isDetecting = false;
    }
  }

  private calculateStats(data: number[]): { mean: number; stdDev: number } {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;

    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev: stdDev || 1 }; // Avoid division by zero
  }

  private createAnomaly(
    metric: string,
    value: number,
    mean: number,
    stdDev: number,
    zScore: number
  ): Anomaly {
    const threshold = this.config.zThreshold;
    let severity: 'low' | 'medium' | 'high' | 'critical';

    if (zScore > 5) {
      severity = 'critical';
    } else if (zScore > 4) {
      severity = 'high';
    } else if (zScore > 3) {
      severity = 'medium';
    } else {
      severity = 'low';
    }

    const explanation = `Value ${value} deviates from mean ${mean.toFixed(2)} by ${zScore.toFixed(2)} standard deviations (${stdDev.toFixed(2)})`;

    return {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      metric,
      value,
      expectedMean: mean,
      standardDeviation: stdDev,
      zScore,
      threshold,
      severity,
      explanation,
      resolved: false,
    };
  }

  getAnomalies(): Anomaly[] {
    return [...this.anomalies];
  }

  async resolveAnomaly(id: string): Promise<boolean> {
    const index = this.anomalies.findIndex((a) => a.id === id);
    if (index !== -1) {
      this.anomalies[index].resolved = true;
      this.emit('anomalyResolved', this.anomalies[index]);

      // Update in database
      const dbManager = DatabaseManager.getInstance();
      await dbManager.resolveAnomaly(id);

      return true;
    }
    return false;
  }

  getActiveAnomalies(): Anomaly[] {
    return this.anomalies.filter((a) => !a.resolved);
  }

  // Integration hook for MetricsCollector
  private integrateWithMetrics(): void {
    const metricsCollector = MetricsCollector.getInstance();
    // This would be called periodically or on events to add data points
    // For example, in a real setup, listen to events or poll
  }
}

export default AnomalyDetectionService;
