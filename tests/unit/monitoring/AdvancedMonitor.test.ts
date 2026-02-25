import { AdvancedMonitor } from '../../../src/monitoring/AdvancedMonitor';
import * as os from 'os';
import * as fs from 'fs';

jest.mock('os', () => ({
  cpuUsage: jest.fn(),
  loadavg: jest.fn(),
  totalmem: jest.fn(),
  freemem: jest.fn(),
  cpus: jest.fn(),
  networkInterfaces: jest.fn(),
}));

jest.mock('fs', () => ({
  statSync: jest.fn(),
}));

describe('AdvancedMonitor', () => {
  let monitor: AdvancedMonitor;

  // Default mock values
  const mockCpuUsage = { user: 100000, system: 50000 };
  const mockLoadAvg = [0.5, 0.4, 0.3];
  const mockTotalMem = 16 * 1024 * 1024 * 1024; // 16GB
  const mockFreeMem = 8 * 1024 * 1024 * 1024; // 8GB
  const mockCpus = [{ model: 'Intel', speed: 3000, times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 } }];
  const mockNetworkInterfaces = { 'eth0': [{ address: '192.168.1.2', family: 'IPv4', internal: false }] };

  beforeEach(() => {
    // Reset singleton instance for clean tests
    (AdvancedMonitor as any).instance = null;
    monitor = AdvancedMonitor.getInstance();

    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup OS mocks
    (os.cpuUsage as jest.Mock).mockReturnValue(mockCpuUsage);
    (os.loadavg as jest.Mock).mockReturnValue(mockLoadAvg);
    (os.totalmem as jest.Mock).mockReturnValue(mockTotalMem);
    (os.freemem as jest.Mock).mockReturnValue(mockFreeMem);
    (os.cpus as jest.Mock).mockReturnValue(mockCpus);
    (os.networkInterfaces as jest.Mock).mockReturnValue(mockNetworkInterfaces);

    // Setup FS mocks
    (fs.statSync as jest.Mock).mockReturnValue({
      isDirectory: () => true,
      size: 1024
    });
  });

  afterEach(() => {
    monitor.stopMonitoring();
    jest.useRealTimers();
    (AdvancedMonitor as any).instance = null;
  });

  describe('Singleton Pattern', () => {
    it('should maintain a single instance', () => {
      const instance1 = AdvancedMonitor.getInstance();
      const instance2 = AdvancedMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Lifecycle Management', () => {
    it('should start and stop monitoring correctly', () => {
      const collectSystemMetricsSpy = jest.spyOn(monitor as any, 'collectSystemMetrics');
      const performHealthChecksSpy = jest.spyOn(monitor as any, 'performHealthChecks');

      monitor.startMonitoring();
      expect((monitor as any).isMonitoring).toBe(true);
      expect((monitor as any).metricsInterval).not.toBeNull();
      expect((monitor as any).healthCheckInterval).not.toBeNull();

      // Verify initial collection
      expect(collectSystemMetricsSpy).toHaveBeenCalled();
      expect(performHealthChecksSpy).toHaveBeenCalled();

      monitor.stopMonitoring();
      expect((monitor as any).isMonitoring).toBe(false);
      expect((monitor as any).metricsInterval).toBeNull();
      expect((monitor as any).healthCheckInterval).toBeNull();
    });

    it('should not start monitoring if already running', () => {
      monitor.startMonitoring();
      const intervalId = (monitor as any).metricsInterval;

      monitor.startMonitoring();
      expect((monitor as any).metricsInterval).toBe(intervalId);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect system metrics correctly', () => {
      monitor.startMonitoring();

      const metrics = monitor.getSystemMetrics(1);
      expect(metrics).toHaveLength(1);

      const latest = metrics[0];
      expect(latest.cpu.loadAverage).toEqual(mockLoadAvg);
      expect(latest.memory.total).toBe(mockTotalMem);
      expect(latest.memory.free).toBe(mockFreeMem);
      expect(latest.memory.used).toBe(mockTotalMem - mockFreeMem);
      expect(latest.memory.usagePercent).toBe(50);
      expect(latest.network.interfaces).toContain('eth0');
    });

    it('should collect application metrics correctly', () => {
      monitor.startMonitoring();

      const metrics = monitor.getApplicationMetrics(1);
      expect(metrics).toHaveLength(1);

      const latest = metrics[0];
      expect(latest).toHaveProperty('activeConnections');
      expect(latest).toHaveProperty('botMetrics');
      expect(latest).toHaveProperty('llmMetrics');
    });

    it('should limit metrics history', () => {
      monitor.startMonitoring();

      // Advance time enough to fill history
      // Interval is 10s, max history is 1000
      // We need to advance 1000 * 10s = 10000s + some buffer

      // Instead of waiting, let's manually call collectSystemMetrics many times
      // since advancing fake timers for 10000 seconds might be slow or hit limits
      const collectSpy = jest.spyOn(monitor as any, 'collectSystemMetrics');

      for(let i = 0; i < 1100; i++) {
        (monitor as any).collectSystemMetrics();
      }

      const metrics = monitor.getSystemMetrics(2000); // Request more than max
      expect(metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Health Checks & Alerts', () => {
    it('should report healthy status under normal conditions', () => {
      monitor.startMonitoring();
      const status = monitor.getHealthStatus();
      expect(status.overall).toBe('healthy');
      expect(status.alerts).toHaveLength(0);
    });

    it('should report degraded status and emit warning on high memory', () => {
      // Mock 86% memory usage (Degraded threshold is 85%)
      const highUsed = mockTotalMem * 0.86;
      (os.freemem as jest.Mock).mockReturnValue(mockTotalMem - highUsed);

      const alertSpy = jest.fn();
      monitor.on('alert', alertSpy);

      monitor.startMonitoring();

      const status = monitor.getHealthStatus();
      expect(status.overall).toBe('degraded');

      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'medium',
        resolved: false
      }));
    });

    it('should report unhealthy status and emit critical alert on critical memory', () => {
      // Mock 96% memory usage (Critical threshold is 95%)
      const criticalUsed = mockTotalMem * 0.96;
      (os.freemem as jest.Mock).mockReturnValue(mockTotalMem - criticalUsed);

      const alertSpy = jest.fn();
      monitor.on('alert', alertSpy);

      monitor.startMonitoring();

      const status = monitor.getHealthStatus();
      expect(status.overall).toBe('unhealthy');

      expect(alertSpy).toHaveBeenCalledWith(expect.objectContaining({
        severity: 'critical',
        resolved: false
      }));
    });

    it('should manage alerts correctly', () => {
      // Create an alert manually via private method or by triggering condition
      // Triggering via condition is better
      const criticalUsed = mockTotalMem * 0.96;
      (os.freemem as jest.Mock).mockReturnValue(mockTotalMem - criticalUsed);

      monitor.startMonitoring();

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const alertId = alerts[0].id;
      const result = monitor.resolveAlert(alertId);
      expect(result).toBe(true);

      const activeAlerts = monitor.getAlerts(true);
      expect(activeAlerts.find(a => a.id === alertId)).toBeUndefined();

      const allAlerts = monitor.getAlerts(false);
      expect(allAlerts.find(a => a.id === alertId)?.resolved).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old metrics and resolved alerts', () => {
       monitor.startMonitoring();

       // Manually add old data
       const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
       (monitor as any).systemMetrics.push({
         timestamp: oldTimestamp,
         memory: { usagePercent: 50 },
         cpu: { usage: 50 }
       });

       (monitor as any).alerts.push({
         id: 'old-alert',
         timestamp: oldTimestamp,
         resolved: true,
         resolvedAt: oldTimestamp
       });

       monitor.cleanup();

       const metrics = (monitor as any).systemMetrics;
       const oldMetric = metrics.find((m: any) => m.timestamp === oldTimestamp);
       expect(oldMetric).toBeUndefined();

       const alerts = (monitor as any).alerts;
       const oldAlert = alerts.find((a: any) => a.id === 'old-alert');
       expect(oldAlert).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in system metrics collection gracefully', () => {
       (os.cpuUsage as jest.Mock).mockImplementation(() => {
         throw new Error('OS Error');
       });

       // Should not throw
       expect(() => (monitor as any).collectSystemMetrics()).not.toThrow();
    });

    it('should handle errors in disk metrics collection gracefully', () => {
       (fs.statSync as jest.Mock).mockImplementation(() => {
         throw new Error('FS Error');
       });

       expect(() => (monitor as any).getDiskMetrics()).not.toThrow();
       const metrics = (monitor as any).getDiskMetrics();
       expect(metrics[0].used).toBe(0);
    });
  });

  describe('Public API', () => {
      it('getMetricsSummary should return correct structure', () => {
          monitor.startMonitoring();
          const summary = monitor.getMetricsSummary();

          expect(summary).toHaveProperty('system');
          expect(summary).toHaveProperty('application');
          expect(summary).toHaveProperty('health');
          expect(summary.health.overall).toBe('healthy');
      });
  });
});
