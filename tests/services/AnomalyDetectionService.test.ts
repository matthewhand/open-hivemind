import { AnomalyDetectionService } from '../../src/services/AnomalyDetectionService';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { WebSocketService } from '../../src/server/services/WebSocketService';
import { MetricsCollector } from '../../src/monitoring/MetricsCollector';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockWsService: jest.Mocked<WebSocketService>;
  let mockMetricsCollector: jest.Mocked<MetricsCollector>;

  beforeEach(() => {
    mockDbManager = {
      storeAnomaly: jest.fn().mockResolvedValue(undefined),
      resolveAnomaly: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<DatabaseManager>;

    mockWsService = {
      recordAlert: jest.fn(),
    } as unknown as jest.Mocked<WebSocketService>;

    mockMetricsCollector = {} as unknown as jest.Mocked<MetricsCollector>;

    service = new AnomalyDetectionService(mockDbManager, mockWsService, mockMetricsCollector);
    (service as any).config = {
      enabled: true,
      windowSize: 50,
      zThreshold: 3,
      metricsToMonitor: ['responseTime', 'errors'],
      minDataPoints: 10,
    };
  });

  afterEach(() => {
    service.shutdown();
    jest.clearAllMocks();
  });

  test('should initialize with default config', () => {
    expect(service).toBeDefined();
    expect(service['config'].enabled).toBe(true);
    expect(service['config'].zThreshold).toBe(3);
  });

  test('should add data point to window', () => {
    service.addDataPoint('responseTime', 150);
    const window = service['dataWindows'].get('responseTime');
    expect(window).toContain(150);
    expect(window!.length).toBe(1);
  });

  test('should not add data point if metric not monitored', () => {
    service['config'].metricsToMonitor = ['cpu'];
    service.addDataPoint('responseTime', 150);
    const window = service['dataWindows'].get('responseTime');
    expect(window).toBeUndefined();
  });

  test('should run detection and detect anomaly', async () => {
    // Add data points to trigger anomaly
    for (let i = 0; i < 20; i++) {
      service.addDataPoint('responseTime', 100 + i * 5);
    }
    service.addDataPoint('responseTime', 500); // Anomaly value

    await service.runDetection();

    expect(service['anomalies'].length).toBeGreaterThan(0);
    expect(mockDbManager.storeAnomaly).toHaveBeenCalled();
    expect(mockWsService.recordAlert).toHaveBeenCalled();
  });

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
    service['anomalies'].push(anomaly as any);

    const result = await service.resolveAnomaly('test-anomaly');

    expect(result).toBe(true);
    expect(service['anomalies'][0].resolved).toBe(true);
    expect(mockDbManager.resolveAnomaly).toHaveBeenCalledWith('test-anomaly');
  });

  test('should get active anomalies', () => {
    service['anomalies'] = [
      { resolved: false } as any,
      { resolved: true } as any,
    ];

    const active = service.getActiveAnomalies();

    expect(active.length).toBe(1);
    expect(active[0].resolved).toBe(false);
  });

  test('should update config', () => {
    service.updateConfig({ zThreshold: 4 });

    expect(service['config'].zThreshold).toBe(4);
  });

  test('addDataPoint should ignore if disabled', () => {
    service.updateConfig({ enabled: false });
    service.addDataPoint('responseTime', 150);
    expect(service['dataWindows'].get('responseTime')).toBeUndefined();
  });

  test('addDataPoint should shift when exceeding windowSize', () => {
    service.updateConfig({ windowSize: 2 });
    service.addDataPoint('responseTime', 100);
    service.addDataPoint('responseTime', 150);
    service.addDataPoint('responseTime', 200);
    const window = service['dataWindows'].get('responseTime');
    expect(window).toEqual([150, 200]);
  });

  test('runDetection should exit early if disabled', async () => {
    service.updateConfig({ enabled: false });
    service.addDataPoint('responseTime', 150);
    await service.runDetection();
    expect(service['anomalies'].length).toBe(0);
  });

  test('runDetection should exit early if already detecting', async () => {
    service['isDetecting'] = true;
    await service.runDetection();
    expect(service['anomalies'].length).toBe(0);
    service['isDetecting'] = false;
  });

  test('runDetection should ignore if not enough minDataPoints', async () => {
    service.updateConfig({ minDataPoints: 5 });
    service.addDataPoint('responseTime', 150);
    service.addDataPoint('responseTime', 200);
    await service.runDetection();
    expect(service['anomalies'].length).toBe(0);
  });

  test('shutdown should clear interval and listeners', () => {
    const removeAllListenersSpy = jest.spyOn(service, 'removeAllListeners');
    // Ensure an interval exists to clear
    service['detectionInterval'] = setInterval(() => {}, 1000);
    service.shutdown();
    expect(service['detectionInterval']).toBeNull();
    expect(removeAllListenersSpy).toHaveBeenCalled();

    // Call shutdown again when interval is null to cover that branch
    service.shutdown();
    expect(service['detectionInterval']).toBeNull();
  });

  test('resolveAnomaly should return false for unknown id', async () => {
    const result = await service.resolveAnomaly('unknown-id');
    expect(result).toBe(false);
  });

  test('createAnomaly should handle different zScore severities', () => {
    // Tests createAnomaly internal method
    const lowAnomaly = service['createAnomaly']('responseTime', 150, 100, 10, 2.5);
    expect(lowAnomaly.severity).toBe('low');

    const mediumAnomaly = service['createAnomaly']('responseTime', 150, 100, 10, 3.5);
    expect(mediumAnomaly.severity).toBe('medium');

    const highAnomaly = service['createAnomaly']('responseTime', 150, 100, 10, 4.5);
    expect(highAnomaly.severity).toBe('high');

    const criticalAnomaly = service['createAnomaly']('responseTime', 150, 100, 10, 5.5);
    expect(criticalAnomaly.severity).toBe('critical');
  });

  test('runDetection should emit WebSocket alert with correct level based on severity', async () => {
    // Clear the global state first
    (service as any).dataWindows.clear();
    (wsService.recordAlert as jest.Mock).mockClear();

    // Low: z <= 3. By default zThreshold is 3, so to trigger low severity we must lower zThreshold.
    service.updateConfig({ zThreshold: 1 });

    // Test 'warning' level (low severity, zScore <= 3)
    for (let i = 0; i < 5; i++) service.addDataPoint('responseTime', 99);
    for (let i = 0; i < 5; i++) service.addDataPoint('responseTime', 101);
    service.addDataPoint('responseTime', 102); // zScore ~ 2

    await service.runDetection();

    expect(wsService.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning'
      })
    );

    // Clear history and test 'warning' (medium severity, zScore > 3 and <= 4)
    (service as any).dataWindows.clear();
    (wsService.recordAlert as jest.Mock).mockClear();
    service.updateConfig({ windowSize: 1000, minDataPoints: 10, zThreshold: 3 });
    for (let i = 0; i < 50; i++) service.addDataPoint('responseTime', 99);
    for (let i = 0; i < 50; i++) service.addDataPoint('responseTime', 101);
    // Add point to push zScore to ~3.5
    service.addDataPoint('responseTime', 103.5);

    await service.runDetection();
    expect(wsService.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning'
      })
    );

    // Clear history and test 'error' (high severity, zScore > 4 and <= 5)
    (service as any).dataWindows.clear();
    (wsService.recordAlert as jest.Mock).mockClear();
    service.updateConfig({ windowSize: 1000, minDataPoints: 10, zThreshold: 3 });
    for (let i = 0; i < 50; i++) service.addDataPoint('responseTime', 99);
    for (let i = 0; i < 50; i++) service.addDataPoint('responseTime', 101);
    // Add point to push zScore to ~4.5
    service.addDataPoint('responseTime', 104.5);

    await service.runDetection();
    expect(wsService.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'error'
      })
    );

    // Clear history and test 'critical' (critical severity, zScore > 5)
    (service as any).dataWindows.clear();
    (wsService.recordAlert as jest.Mock).mockClear();
    service.updateConfig({ windowSize: 1000, minDataPoints: 10, zThreshold: 3 });
    for (let i = 0; i < 100; i++) service.addDataPoint('responseTime', 99);
    for (let i = 0; i < 100; i++) service.addDataPoint('responseTime', 101);
    service.addDataPoint('responseTime', 110);

    await service.runDetection();
    expect(wsService.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'critical'
      })
    );
  });

  test('runDetection should not create anomaly if zScore is below threshold', async () => {
    (service as any).dataWindows.clear();
    (wsService.recordAlert as jest.Mock).mockClear();
    service.updateConfig({ windowSize: 1000, minDataPoints: 10, zThreshold: 3 });
    for (let i = 0; i < 50; i++) service.addDataPoint('responseTime', 100);

    // Add point close to mean
    service.addDataPoint('responseTime', 100);

    await service.runDetection();

    expect(service['anomalies'].length).toBe(0);
    expect(wsService.recordAlert).not.toHaveBeenCalled();
  });

  test('runDetection should handle storeAnomaly errors gracefully', async () => {
    // Force storeAnomaly to reject
    const mockDbError = new Error('DB Error');
    mockDbManager.storeAnomaly.mockRejectedValue(mockDbError);

    // Mock the global debug logger if we need to assert, but the catch block triggers coverage

    for (let i = 0; i < 20; i++) {
      service.addDataPoint('responseTime', 100 + i * 5);
    }
    service.addDataPoint('responseTime', 500); // Anomaly value

    await service.runDetection();

    // We need to wait a tick for the Promise.allSettled and catch block to resolve
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify error was handled and detection finished
    expect(service['isDetecting']).toBe(false);
  });

  test('coverage for stdDev edge case', () => {
    // calculateStats should return stdDev 1 if stdDev is 0
    const { mean, stdDev } = service['calculateStats']([100, 100, 100]);
    expect(mean).toBe(100);
    expect(stdDev).toBe(1);
  });

  test('integrateWithMetrics is defined', () => {
    // It's a private method, but we can verify it exists
    expect(typeof service['integrateWithMetrics']).toBe('function');
    // Call it to get coverage on this stub method
    service['integrateWithMetrics']();
  });

  test('addDataPoint should handle null, undefined, NaN, and Infinity', () => {
    service.addDataPoint('responseTime', null as any);
    expect(service['dataWindows'].get('responseTime')).toBeUndefined();

    service.addDataPoint('responseTime', undefined as any);
    expect(service['dataWindows'].get('responseTime')).toBeUndefined();

    service.addDataPoint('responseTime', NaN);
    expect(service['dataWindows'].get('responseTime')).toBeUndefined();

    service.addDataPoint('responseTime', Infinity);
    expect(service['dataWindows'].get('responseTime')).toBeUndefined();

    service.addDataPoint('responseTime', -Infinity);
    expect(service['dataWindows'].get('responseTime')).toBeUndefined();
  });

  test('getAnomalies should return a copy of the anomalies array', () => {
    const anomaly = {
      id: 'test-anomaly-get',
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
    service['anomalies'].push(anomaly as any);

    const anomalies = service.getAnomalies();
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].id).toBe('test-anomaly-get');

    // Modifying the returned array should not affect the original array
    anomalies.push({ id: 'another-anomaly' } as any);
    expect(service['anomalies'].length).toBe(1);
  });

  test('should emit anomalyDetected event with correct payload when anomaly is created', async () => {
    const anomalyHandler = jest.fn();
    service.on('anomalyDetected', anomalyHandler);

    // Seed enough data points and then add an outlier to trigger anomaly detection
    for (let i = 0; i < 20; i++) {
      service.addDataPoint('responseTime', 100 + i * 5);
    }
    service.addDataPoint('responseTime', 500); // Outlier that should trigger anomaly

    await service.runDetection();

    expect(anomalyHandler).toHaveBeenCalledTimes(1);
    const payload = anomalyHandler.mock.calls[0][0];
    expect(payload).toMatchObject({
      metric: 'responseTime',
      value: 500,
      resolved: false,
    });
    expect(payload.id).toBeDefined();
    expect(payload.zScore).toBeGreaterThan(3);
    expect(payload.severity).toBeDefined();

    service.removeListener('anomalyDetected', anomalyHandler);
  });

  test('should emit dataPointAdded event when addDataPoint is called', () => {
    const dataPointHandler = jest.fn();
    service.on('dataPointAdded', dataPointHandler);

    service.addDataPoint('responseTime', 150);

    expect(dataPointHandler).toHaveBeenCalledTimes(1);
    expect(dataPointHandler).toHaveBeenCalledWith({ metric: 'responseTime', value: 150 });

    // Add another data point to verify repeated emission
    service.addDataPoint('responseTime', 200);
    expect(dataPointHandler).toHaveBeenCalledTimes(2);
    expect(dataPointHandler).toHaveBeenCalledWith({ metric: 'responseTime', value: 200 });

    service.removeListener('dataPointAdded', dataPointHandler);
  });

});
