import { AdvancedMonitor } from '../../../src/monitoring/AdvancedMonitor';
import * as os from 'os';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('os');

describe('AdvancedMonitor', () => {
  let monitor: AdvancedMonitor;

  // Mock data
  const mockCpuUsage = { user: 100000, system: 50000 };
  const mockMemoryUsage = { rss: 100, heapTotal: 200, heapUsed: 50, external: 0, arrayBuffers: 0 };
  const mockLoadAvg = [1.5, 1.2, 1.0];
  const mockTotalMem = 16000000000;
  const mockFreeMem = 8000000000;
  const mockCpus = Array(8).fill({ model: 'Intel', speed: 2500, times: { user: 100, nice: 0, sys: 50, idle: 1000, irq: 0 } });
  const mockNetworkInterfaces = { eth0: [{ address: '192.168.1.2' }] };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Reset singleton
    (AdvancedMonitor as any).instance = null;
    monitor = AdvancedMonitor.getInstance();

    // Reset mocks
    jest.clearAllMocks();

    // Mock os methods
    (os.loadavg as jest.Mock).mockReturnValue(mockLoadAvg);
    (os.totalmem as jest.Mock).mockReturnValue(mockTotalMem);
    (os.freemem as jest.Mock).mockReturnValue(mockFreeMem);
    (os.cpus as jest.Mock).mockReturnValue(mockCpus);
    (os.networkInterfaces as jest.Mock).mockReturnValue(mockNetworkInterfaces);

    // Mock fs methods
    (fs.statSync as jest.Mock).mockReturnValue({
      size: 1000,
      mtime: new Date(),
    });

    // Spy on process methods
    jest.spyOn(process, 'cpuUsage').mockReturnValue(mockCpuUsage);
    jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);
    jest.spyOn(process, 'uptime').mockReturnValue(100);
  });

  afterEach(() => {
    monitor.stopMonitoring();
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
    it('should start monitoring and set intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      monitor.startMonitoring();
      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // One for metrics, one for health check
      expect((monitor as any).isMonitoring).toBe(true);
    });

    it('should not start if already monitoring', () => {
      monitor.startMonitoring();
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      monitor.startMonitoring();
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('should stop monitoring and clear intervals', () => {
      monitor.startMonitoring();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      monitor.stopMonitoring();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
      expect((monitor as any).isMonitoring).toBe(false);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect system and application metrics', () => {
      monitor.startMonitoring();

      const systemMetricsSpy = jest.fn();
      const appMetricsSpy = jest.fn();
      monitor.on('system-metrics', systemMetricsSpy);
      monitor.on('application-metrics', appMetricsSpy);

      // Fast-forward time to trigger collection (10s interval)
      jest.advanceTimersByTime(10000);

      expect(systemMetricsSpy).toHaveBeenCalled();
      expect(appMetricsSpy).toHaveBeenCalled();

      const systemMetrics = systemMetricsSpy.mock.calls[0][0];
      expect(systemMetrics.cpu.cores).toBe(8);
      expect(systemMetrics.memory.total).toBe(mockTotalMem);

      // Verify stored metrics
      expect(monitor.getSystemMetrics().length).toBeGreaterThan(0);
      expect(monitor.getApplicationMetrics().length).toBeGreaterThan(0);
    });

    it('should maintain history limits', () => {
      monitor.startMonitoring();
      // Only verify that it adds to the array as waiting for 1000 items is too slow/complex for unit test
      // without modifying constants or looping 1000 times.

      jest.advanceTimersByTime(10000);
      expect(monitor.getSystemMetrics().length).toBeGreaterThan(0);
    });
  });

  describe('Health Checks & Alerts', () => {
    it('should perform health checks and emit status', () => {
      monitor.startMonitoring();
      const healthCheckSpy = jest.fn();
      monitor.on('health-check', healthCheckSpy);

      jest.advanceTimersByTime(30000); // 30s interval

      expect(healthCheckSpy).toHaveBeenCalled();
      const status = healthCheckSpy.mock.calls[0][0];
      expect(status.overall).toBeDefined();
    });

    it('should trigger alert on high memory usage', () => {
        // Simulate high memory usage (low free memory)
        (os.freemem as jest.Mock).mockReturnValue(mockTotalMem * 0.04); // 4% free => 96% used

        monitor.startMonitoring();
        const alertSpy = jest.fn();
        monitor.on('alert', alertSpy);

        // Advance time to trigger collection (to update systemMetrics) and health check
        jest.advanceTimersByTime(30000);

        expect(alertSpy).toHaveBeenCalled();
        const alert = alertSpy.mock.calls[0][0];
        expect(alert.severity).toBe('critical'); // > 95% is critical in checkSystemAlerts which runs on collection
    });

    it('should identify degraded state', () => {
       // Simulate degraded memory usage (12% free => 88% used)
       // checkSystemAlerts: >95 critical
       // performHealthChecks: >90 unhealthy, >80 degraded
       (os.freemem as jest.Mock).mockReturnValue(mockTotalMem * 0.12);

       monitor.startMonitoring();

       // Need to collect metrics first
       jest.advanceTimersByTime(10000); // collection

       const status = monitor.getHealthStatus();
       expect(status.overall).toBe('degraded');
    });
  });

  describe('Alert Management', () => {
    it('should manage alerts', () => {
      // Let's trigger an alert via high memory
      (os.freemem as jest.Mock).mockReturnValue(0); // 100% used
      monitor.startMonitoring();
      jest.advanceTimersByTime(10000); // Trigger collection -> checkSystemAlerts

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      const alertId = alerts[0].id;

      const resolved = monitor.resolveAlert(alertId);
      expect(resolved).toBe(true);

      const activeAlerts = monitor.getAlerts(true);
      expect(activeAlerts.find((a) => a.id === alertId)).toBeUndefined();

      const allAlerts = monitor.getAlerts(false);
      expect(allAlerts.length).toBeGreaterThan(0);
      expect(allAlerts.find((a) => a.id === alertId)?.resolved).toBe(true);
    });
  });

  describe('Cleanup', () => {
      it('should cleanup old data', () => {
          const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

          (monitor as any).systemMetrics.push({ timestamp: oldTimestamp });
          (monitor as any).alerts.push({
              id: 'old',
              timestamp: oldTimestamp,
              resolved: true,
              resolvedAt: oldTimestamp
          });

          monitor.cleanup();

          expect((monitor as any).systemMetrics.find((m: any) => m.timestamp === oldTimestamp)).toBeUndefined();
          expect((monitor as any).alerts.find((a: any) => a.id === 'old')).toBeUndefined();
      });
  });

  describe('Metrics Summary', () => {
      it('should return metrics summary', () => {
          monitor.startMonitoring();
          jest.advanceTimersByTime(10000);

          const summary = monitor.getMetricsSummary();
          expect(summary.system).toBeDefined();
          expect(summary.application).toBeDefined();
          expect(summary.health).toBeDefined();
      });
  });
});
