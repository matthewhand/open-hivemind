import { AnomalyDetectionService } from '../../src/services/AnomalyDetectionService';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { WebSocketService } from '../../src/server/services/WebSocketService';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let dbManager: DatabaseManager;
  let wsService: WebSocketService;

  beforeEach(() => {
    service = AnomalyDetectionService.getInstance();
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

    // Mock runDetection call
    jest.spyOn(service as any, 'runDetection').mockImplementation(async () => {
      const window = service['dataWindows'].get('responseTime')!;
      const { mean, stdDev } = service['calculateStats'](window);
      const recentValue = window[window.length - 1];
      const zScore = Math.abs((recentValue - mean) / stdDev);
      if (zScore > 3) {
        const anomaly = service['createAnomaly']('responseTime', recentValue, mean, stdDev, zScore);
        service['anomalies'].push(anomaly);
        service.emit('anomalyDetected', anomaly);
        await dbManager.storeAnomaly(anomaly);
        wsService.recordAlert({ level: 'warning', title: 'Test', message: 'Test' });
      }
    });

    await service['runDetection']();

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
});