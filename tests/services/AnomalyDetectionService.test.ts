import { DatabaseManager } from '../../src/database/DatabaseManager';
import { WebSocketService } from '../../src/server/services/WebSocketService';
import { AnomalyDetectionService } from '../../src/services/AnomalyDetectionService';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let dbManager: DatabaseManager;
  let wsService: WebSocketService;

  let metricsCollector: any;

  beforeEach(() => {
    // Force a fresh instance for clean tests
    (AnomalyDetectionService as any).instance = undefined;
    dbManager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
    wsService = WebSocketService.getInstance();
    metricsCollector = {} as any; // Mock metrics collector

    service = new AnomalyDetectionService(dbManager, wsService, metricsCollector);
    (AnomalyDetectionService as any).instance = service;

    // Default config values
    service.updateConfig({
      enabled: true,
      windowSize: 50,
      zThreshold: 3,
      metricsToMonitor: ['responseTime', 'errors'],
      minDataPoints: 10,
    });

    // Clear state
    (service as any).dataWindows.clear();
    (service as any).anomalies = [];
    (service as any).isDetecting = false;

    jest.spyOn(dbManager, 'storeAnomaly').mockResolvedValue(undefined);
    jest.spyOn(dbManager, 'resolveAnomaly').mockResolvedValue(true);
    jest.spyOn(wsService, 'recordAlert').mockImplementation();
  });

  afterEach(async () => {
    service.shutdown();
    await dbManager.disconnect();
    jest.restoreAllMocks();
  });

  describe('Initialization and Config', () => {
    test('should initialize with default config', () => {
      expect(service).toBeDefined();
      expect(service['config'].enabled).toBe(true);
      expect(service['config'].zThreshold).toBe(3);
    });

    test('should update config', () => {
      service.updateConfig({ zThreshold: 4, windowSize: 100 });
      expect(service['config'].zThreshold).toBe(4);
      expect(service['config'].windowSize).toBe(100);
    });

    test('should shutdown and clear intervals', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const interval = service['detectionInterval'];
      expect(interval).not.toBeNull();

      service.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalledWith(interval);
      expect(service['detectionInterval']).toBeNull();
    });
  });

  describe('addDataPoint', () => {
    test('should add data point to window', () => {
      const emitSpy = jest.spyOn(service, 'emit');
      service.addDataPoint('responseTime', 150);

      const window = service['dataWindows'].get('responseTime');
      expect(window).toContain(150);
      expect(window!.length).toBe(1);
      expect(emitSpy).toHaveBeenCalledWith('dataPointAdded', {
        metric: 'responseTime',
        value: 150,
      });
    });

    test('should not add data point if metric not monitored', () => {
      service.updateConfig({ metricsToMonitor: ['cpu'] });
      service.addDataPoint('responseTime', 150);

      const window = service['dataWindows'].get('responseTime');
      expect(window).toBeUndefined();
    });

    test('should not add data point if disabled', () => {
      service.updateConfig({ enabled: false });
      service.addDataPoint('responseTime', 150);

      const window = service['dataWindows'].get('responseTime');
      expect(window).toBeUndefined();
    });

    test('should shift old data points when window is full', () => {
      service.updateConfig({ windowSize: 3 });

      service.addDataPoint('responseTime', 1);
      service.addDataPoint('responseTime', 2);
      service.addDataPoint('responseTime', 3);
      service.addDataPoint('responseTime', 4);

      const window = service['dataWindows'].get('responseTime');
      expect(window).toEqual([2, 3, 4]); // 1 should be shifted out
    });
  });

  describe('runDetection', () => {
    test('should skip detection if disabled', async () => {
      service.updateConfig({ enabled: false });
      await service.runDetection();
      expect(service['isDetecting']).toBe(false);
    });

    test('should skip detection if already detecting', async () => {
      service['isDetecting'] = true;
      await service.runDetection();
      // It shouldn't change isDetecting back to false if it skipped
      expect(service['isDetecting']).toBe(true);
    });

    test('should skip metric if not enough data points', async () => {
      service.updateConfig({ minDataPoints: 5 });
      service.addDataPoint('responseTime', 100);
      service.addDataPoint('responseTime', 100);

      await service.runDetection();

      expect(service.getAnomalies().length).toBe(0);
    });

    test('should not detect anomaly if within threshold', async () => {
      service.updateConfig({ minDataPoints: 5, zThreshold: 3 });

      // Add standard data
      for (let i = 0; i < 5; i++) {
        service.addDataPoint('responseTime', 100);
      }

      await service.runDetection();

      expect(service.getAnomalies().length).toBe(0);
      expect(dbManager.storeAnomaly).not.toHaveBeenCalled();
    });

    test('should detect medium anomaly and trigger alerts', async () => {
      service.updateConfig({ minDataPoints: 5, zThreshold: 3 });

      // Add standard data (mean=100, stdDev=0 initially, but calculateStats handles it)
      for (let i = 0; i < 5; i++) {
        service.addDataPoint('responseTime', 100);
      }
      // Add one point slightly off to give a small stdDev
      service.addDataPoint('responseTime', 101);

      // Calculate roughly the current mean and stddev:
      // mean = 100.16, stddev = 0.37
      // We want a z-score between 3 and 4 for medium
      // target = mean + z * stddev = 100.16 + 3.5 * 0.37 = ~101.45
      // Wait, the new value also affects the mean and stddev.
      // Let's just add a very large value to ensure it crosses the threshold.

      const emitSpy = jest.spyOn(service, 'emit');

      // To get a medium anomaly (3 < z <= 4)
      // Actually let's just mock calculateStats to return predictable values
      jest.spyOn(service as any, 'calculateStats').mockReturnValue({ mean: 100, stdDev: 10 });

      // Add the anomalous value (z-score = 3.5 -> medium)
      service.addDataPoint('responseTime', 135);

      await service.runDetection();

      const anomalies = service.getAnomalies();
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].severity).toBe('medium');
      expect(anomalies[0].metric).toBe('responseTime');
      expect(anomalies[0].value).toBe(135);
      expect(anomalies[0].zScore).toBe(3.5);

      expect(emitSpy).toHaveBeenCalledWith('anomalyDetected', anomalies[0]);
      expect(dbManager.storeAnomaly).toHaveBeenCalledWith(anomalies[0]);
      expect(wsService.recordAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warning',
          title: 'Anomaly Detected: responseTime',
        })
      );
    });

    test('should categorize severities correctly', async () => {
      service.updateConfig({ minDataPoints: 5, zThreshold: 2 });

      for (let i = 0; i < 5; i++) {
        service.addDataPoint('responseTime', 100);
      }

      const calcStatsSpy = jest.spyOn(service as any, 'calculateStats');

      // Test High severity (4 < z <= 5)
      calcStatsSpy.mockReturnValue({ mean: 100, stdDev: 10 });
      service.addDataPoint('responseTime', 145); // z = 4.5
      await service.runDetection();
      expect(service.getAnomalies()[0].severity).toBe('high');
      expect(wsService.recordAlert).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'error' })
      );

      (service as any).anomalies = []; // Reset

      // Test Critical severity (z > 5)
      calcStatsSpy.mockReturnValue({ mean: 100, stdDev: 10 });
      service.addDataPoint('responseTime', 160); // z = 6
      await service.runDetection();
      expect(service.getAnomalies()[0].severity).toBe('critical');
      expect(wsService.recordAlert).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'critical' })
      );

      (service as any).anomalies = []; // Reset

      // Test Low severity (z <= 3 but > threshold)
      calcStatsSpy.mockReturnValue({ mean: 100, stdDev: 10 });
      service.addDataPoint('responseTime', 125); // z = 2.5
      await service.runDetection();
      expect(service.getAnomalies()[0].severity).toBe('low');
      expect(wsService.recordAlert).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'warning' })
      );
    });

    test('should handle database storage errors gracefully', async () => {
      service.updateConfig({ minDataPoints: 5, zThreshold: 3 });

      for (let i = 0; i < 5; i++) {
        service.addDataPoint('responseTime', 100);
      }

      jest.spyOn(service as any, 'calculateStats').mockReturnValue({ mean: 100, stdDev: 10 });
      service.addDataPoint('responseTime', 150); // z = 5

      // Mock db failure
      const dbError = new Error('DB Connection Failed');
      jest.spyOn(dbManager, 'storeAnomaly').mockRejectedValueOnce(dbError);

      // Should not throw
      await expect(service.runDetection()).resolves.not.toThrow();

      // Anomaly still recorded in memory and alert sent
      expect(service.getAnomalies().length).toBe(1);
      expect(wsService.recordAlert).toHaveBeenCalled();
    });
  });

  describe('Anomaly Management', () => {
    test('should resolve anomaly', async () => {
      const anomaly = {
        id: 'test-anomaly',
        timestamp: new Date(),
        metric: 'responseTime',
        value: 500,
        expectedMean: 100,
        standardDeviation: 20,
        zScore: 20,
        threshold: 3,
        severity: 'critical' as const,
        explanation: 'Test anomaly',
        resolved: false,
      };
      (service as any).anomalies.push(anomaly);

      const emitSpy = jest.spyOn(service, 'emit');

      const result = await service.resolveAnomaly('test-anomaly');

      expect(result).toBe(true);
      expect(service.getAnomalies()[0].resolved).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        'anomalyResolved',
        expect.objectContaining({ id: 'test-anomaly', resolved: true })
      );
      expect(dbManager.resolveAnomaly).toHaveBeenCalledWith('test-anomaly');
    });

    test('should return false when resolving non-existent anomaly', async () => {
      const result = await service.resolveAnomaly('non-existent');
      expect(result).toBe(false);
      expect(dbManager.resolveAnomaly).not.toHaveBeenCalled();
    });

    test('should get active anomalies', () => {
      (service as any).anomalies = [
        { id: '1', resolved: false } as any,
        { id: '2', resolved: true } as any,
      ];

      const active = service.getActiveAnomalies();

      expect(active.length).toBe(1);
      expect(active[0].id).toBe('1');
      expect(active[0].resolved).toBe(false);
    });
  });
});
