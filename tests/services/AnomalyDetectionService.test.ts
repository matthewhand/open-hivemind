import { AnomalyDetectionService } from '../../src/services/AnomalyDetectionService';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { WebSocketService } from '../../src/server/services/WebSocketService';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let dbManager: DatabaseManager;
  let wsService: WebSocketService;

  let metricsCollector: any;

  beforeEach(() => {
    service = AnomalyDetectionService.getInstance();
    (service as any).dataWindows.clear();
    (service as any).anomalies = [];
    (service as any).config = {
      enabled: true,
      windowSize: 50,
      zThreshold: 3,
      metricsToMonitor: ['responseTime', 'errors'],
      minDataPoints: 10,
    };
    dbManager = DatabaseManager.getInstance({ type: 'sqlite', path: ':memory:' });
    wsService = WebSocketService.getInstance();
    jest.spyOn(dbManager, 'storeAnomaly').mockResolvedValue();
    jest.spyOn(dbManager, 'resolveAnomaly').mockResolvedValue(true);
    jest.spyOn(wsService, 'recordAlert').mockImplementation();
  });

  afterEach(async () => {
    await dbManager.disconnect();
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
    expect(dbManager.storeAnomaly).toHaveBeenCalled();
    expect(wsService.recordAlert).toHaveBeenCalled();
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
    expect(dbManager.resolveAnomaly).toHaveBeenCalledWith('test-anomaly');
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

  test('runDetection should handle storeAnomaly errors gracefully', async () => {
    // Force storeAnomaly to reject
    const mockDbError = new Error('DB Error');
    jest.spyOn(dbManager, 'storeAnomaly').mockRejectedValue(mockDbError);

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

});