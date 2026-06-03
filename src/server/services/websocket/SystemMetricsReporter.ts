import os from 'os';
import { injectable, singleton } from 'tsyringe';

/**
 * Collects and formats system-level performance metrics
 */
@singleton()
@injectable()
export class SystemMetricsReporter {
  private lastCpuUsage = process.cpuUsage();
  private lastHrTime = process.hrtime.bigint();
  private messageRateHistory: number[] = new Array(60).fill(0);
  private errorRateHistory: number[] = new Array(60).fill(0);

  public getSystemStatus(): any {
    const cpuUsage = this.calculateCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpu: cpuUsage,
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      uptime: process.uptime(),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      timestamp: new Date().toISOString(),
      rates: {
        messageRate: this.messageRateHistory[this.messageRateHistory.length - 1] || 0,
        errorRate: this.errorRateHistory[this.errorRateHistory.length - 1] || 0,
        messageRateHistory: this.messageRateHistory,
        errorRateHistory: this.errorRateHistory,
      },
    };
  }

  public updateRates(messageCount: number, errorCount: number): void {
    this.messageRateHistory.push(messageCount);
    if (this.messageRateHistory.length > 60) this.messageRateHistory.shift();

    this.errorRateHistory.push(errorCount);
    if (this.errorRateHistory.length > 60) this.errorRateHistory.shift();
  }

  private calculateCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const currentHrTime = process.hrtime.bigint();
    const elapsedHrTime = currentHrTime - this.lastHrTime;

    this.lastCpuUsage = process.cpuUsage();
    this.lastHrTime = currentHrTime;

    const elapsedMs = Number(elapsedHrTime) / 1_000_000;
    const userMs = currentCpuUsage.user / 1000;
    const systemMs = currentCpuUsage.system / 1000;

    // Aggregate over all CPU cores
    const cpuPercent = (100 * (userMs + systemMs)) / (elapsedMs || 1);
    return Math.min(100, Math.round(cpuPercent * 10) / 10);
  }
}
