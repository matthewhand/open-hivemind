import os from 'os';
import type { MessageFlowEvent, PerformanceMetric } from '../types';

/**
 * Calculates real-time system and bot performance metrics.
 */
export class MetricCalculator {
  private performanceMetrics: PerformanceMetric[] = [];
  private messageRateHistory: number[] = new Array(60).fill(0);
  private errorRateHistory: number[] = new Array(60).fill(0);

  private lastCpuUsage = process.cpuUsage();
  private lastHrTime = process.hrtime.bigint();

  public updateRateHistory(events: MessageFlowEvent[]): void {
    const now = new Date();
    const lastMinute = events.filter((e) => {
      const diff = now.getTime() - new Date(e.timestamp).getTime();
      return diff < 60000;
    });

    const msgCount = lastMinute.length;
    const errCount = lastMinute.filter((e) => e.status === 'error').length;

    this.messageRateHistory.shift();
    this.messageRateHistory.push(msgCount);

    this.errorRateHistory.shift();
    this.errorRateHistory.push(errCount);
  }

  public calculateSystemMetric(connectedClients: number): PerformanceMetric {
    const cpu = this.calculateCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / (totalMem || 1)) * 100;

    const avgResponseTime = this.calculateAvgResponseTime();

    const metric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      cpuUsage: cpu,
      memoryUsage: memUsage,
      activeConnections: connectedClients,
      messageRate: this.messageRateHistory[this.messageRateHistory.length - 1],
      errorRate:
        this.errorRateHistory[this.errorRateHistory.length - 1] /
        (this.messageRateHistory[this.messageRateHistory.length - 1] || 1),
      responseTime: avgResponseTime,
    };

    this.performanceMetrics.unshift(metric);
    if (this.performanceMetrics.length > 360) {
      this.performanceMetrics.pop();
    }

    return metric;
  }

  public calculateCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage();
    const currentHrTime = process.hrtime.bigint();

    const elapCpu =
      BigInt(currentCpuUsage.user - this.lastCpuUsage.user) +
      BigInt(currentCpuUsage.system - this.lastCpuUsage.system);
    const elapTime = currentHrTime - this.lastHrTime;

    this.lastCpuUsage = currentCpuUsage;
    this.lastHrTime = currentHrTime;

    // Use BigInt conversion for the constant to avoid ES2020 target issues with literal '1000n' if needed,
    // though the project seems to support it. 1000000 is used for micros to millis.
    const usage = Number(elapCpu) / Number(elapTime / BigInt(1000));
    const cpuCores = Math.max(1, os.cpus()?.length || 1);
    return (usage / cpuCores) * 100;
  }

  private calculateAvgResponseTime(): number {
    if (this.performanceMetrics.length === 0) return 0;
    const last10 = this.performanceMetrics.slice(0, 10);
    return last10.reduce((acc, m) => acc + m.responseTime, 0) / last10.length;
  }

  public getPerformanceMetrics(limit = 60): PerformanceMetric[] {
    return this.performanceMetrics.slice(0, limit);
  }

  public getMessageRateHistory(): number[] {
    return [...this.messageRateHistory];
  }

  public getErrorRateHistory(): number[] {
    return [...this.errorRateHistory];
  }
}
