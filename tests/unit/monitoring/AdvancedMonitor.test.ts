import { AdvancedMonitor } from '../../../src/monitoring/AdvancedMonitor';
import * as fs from 'fs';
import * as os from 'os';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn(),
}));

jest.mock('os', () => ({
  ...jest.requireActual('os'),
  loadavg: jest.fn(),
  totalmem: jest.fn(),
  freemem: jest.fn(),
  cpus: jest.fn(),
  networkInterfaces: jest.fn(),
}));

describe('AdvancedMonitor', () => {
  let monitor: AdvancedMonitor;

  beforeEach(() => {
    // Reset the singleton instance
    (AdvancedMonitor as any).instance = null;
    monitor = AdvancedMonitor.getInstance();

    // Clear all mocks
    jest.clearAllMocks();

    // Use fake timers
    jest.useFakeTimers();

    // Default mock implementations
    jest.spyOn(process, 'cpuUsage').mockReturnValue({ user: 1000, system: 500 });
    (os.loadavg as jest.Mock).mockReturnValue([0.5, 0.5, 0.5]);
    (os.totalmem as jest.Mock).mockReturnValue(16000000000);
    (os.freemem as jest.Mock).mockReturnValue(8000000000);
    (os.cpus as jest.Mock).mockReturnValue(new Array(8).fill({}));
    (os.networkInterfaces as jest.Mock).mockReturnValue({ eth0: [] });

    (fs.statSync as jest.Mock).mockReturnValue({ size: 1000 });
  });

  afterEach(() => {
    monitor.stopMonitoring();
    (AdvancedMonitor as any).instance = null;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AdvancedMonitor.getInstance();
      const instance2 = AdvancedMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring and set up intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      monitor.startMonitoring();
      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // Metrics collection + Health checks
    });

    it('should stop monitoring and clear intervals', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      monitor.startMonitoring();
      monitor.stopMonitoring();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('should not start monitoring if already running', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      monitor.startMonitoring();
      monitor.startMonitoring();
      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // Still 2, not 4
    });
  });

  describe('Metrics Collection', () => {
    it('should collect system metrics', () => {
      const emitSpy = jest.spyOn(monitor, 'emit');
      monitor.startMonitoring();

      // Advance time by collection interval (10s)
      jest.advanceTimersByTime(10000);

      expect(emitSpy).toHaveBeenCalledWith('system-metrics', expect.objectContaining({
        timestamp: expect.any(Number),
        cpu: expect.any(Object),
        memory: expect.any(Object),
      }));

      const metrics = monitor.getSystemMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].memory.total).toBe(16000000000);
    });

    it('should collect application metrics', () => {
      const emitSpy = jest.spyOn(monitor, 'emit');
      monitor.startMonitoring();

      // Advance time by collection interval (10s)
      jest.advanceTimersByTime(10000);

      expect(emitSpy).toHaveBeenCalledWith('application-metrics', expect.objectContaining({
        timestamp: expect.any(Number),
        activeConnections: expect.any(Number),
      }));

      const metrics = monitor.getApplicationMetrics();
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should maintain history limit', () => {
      monitor.startMonitoring();
      jest.advanceTimersByTime(10000 * 5);
      expect(monitor.getSystemMetrics().length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Health Checks & Alerts', () => {
    it('should emit alert on high memory usage', () => {
      // Mock high memory usage
      (os.freemem as jest.Mock).mockReturnValue(100000000); // Very low free memory

      const alertSpy = jest.spyOn(monitor, 'emit');
      monitor.startMonitoring();

      // Advance time to trigger metrics collection then health check
      jest.advanceTimersByTime(30000);

      const alertCalls = alertSpy.mock.calls.filter(call => call[0] === 'alert');
      expect(alertCalls.length).toBeGreaterThan(0);
      expect(alertCalls[0][1]).toEqual(expect.objectContaining({
        severity: 'critical', // > 95% usage
      }));
    });

    it('should update health status based on metrics', () => {
      // Mock high CPU usage
      jest.spyOn(process, 'cpuUsage').mockReturnValue({ user: 96000000, system: 0 }); // 96 seconds

      monitor.startMonitoring();
      jest.advanceTimersByTime(30000);

      const health = monitor.getHealthStatus();
      expect(health.overall).toBe('unhealthy');
    });
  });

  describe('Alert Management', () => {
    it('should manage alerts correctly', () => {
      // Manually emit an alert for testing
      monitor.emit('alert', {
        id: 'test-alert',
        severity: 'high',
        message: 'Test Alert',
        timestamp: Date.now(),
        resolved: false
      });

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBe(1);
      expect(alerts[0].id).toBe('test-alert');

      const resolved = monitor.resolveAlert('test-alert');
      expect(resolved).toBe(true);

      const activeAlerts = monitor.getAlerts(true);
      expect(activeAlerts.length).toBe(0);

      const allAlerts = monitor.getAlerts(false);
      expect(allAlerts.length).toBe(1);
      expect(allAlerts[0].resolved).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old metrics and alerts', () => {
      const now = Date.now();
      const oldTime = now - (25 * 60 * 60 * 1000); // 25 hours ago

      // Inject old data
      (monitor as any).systemMetrics.push({
        timestamp: oldTime,
        memory: { usagePercent: 50 },
        cpu: { usage: 10 }
      });

      (monitor as any).alerts.push({
        id: 'old-alert',
        timestamp: oldTime,
        resolved: true,
        resolvedAt: oldTime
      });

      monitor.cleanup();

      // Should be removed
      expect((monitor as any).systemMetrics.length).toBe(0);
      expect(monitor.getAlerts(false).length).toBe(0);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle errors during metrics collection', () => {
      // Mock fs.statSync to throw error
      (fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('Disk error');
      });

      monitor.startMonitoring();
      jest.advanceTimersByTime(10000);

      // Should still have collected other metrics (or failed gracefully)
      // collectSystemMetrics catches error and logs it, but might not push partial metrics if it fails early.
      // In AdvancedMonitor.ts:
      // try { ... this.systemMetrics.push(metrics); ... } catch (error) { debug(...) }
      // So if getDiskMetrics throws, it is caught inside getDiskMetrics and returns default.
      // But if something else throws inside collectSystemMetrics main block?
      // "const diskMetrics = this.getDiskMetrics();" calls getDiskMetrics which has its own try-catch.
      // Let's verify disk metrics are zeroed out if fs fails.

      const metrics = monitor.getSystemMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].disk[0].used).toBe(0);
    });

    it('should return empty summary when no metrics collected', () => {
      const summary = monitor.getMetricsSummary();
      expect(summary.system).toEqual({});
      expect(summary.application).toEqual({});
      expect(summary.health.overall).toBe('healthy'); // Default when no metrics
    });

    it('should report degraded status', () => {
      // Mock CPU usage between 85 and 95
      jest.spyOn(process, 'cpuUsage').mockReturnValue({ user: 90000000, system: 0 }); // 90 seconds

      monitor.startMonitoring();
      jest.advanceTimersByTime(30000);

      const health = monitor.getHealthStatus();
      expect(health.overall).toBe('degraded');
    });
  });

  describe('Public API', () => {
    it('getMetricsSummary should return correct populated structure', () => {
      monitor.startMonitoring();
      jest.advanceTimersByTime(10000); // Collect some metrics

      const summary = monitor.getMetricsSummary();

      expect(summary).toHaveProperty('system');
      expect(summary.system).toHaveProperty('cpu');
      expect(summary.system).toHaveProperty('memory');
      expect(summary).toHaveProperty('application');
      expect(summary).toHaveProperty('health');
      expect(summary.health.overall).toBe('healthy');
    });
  });
});
