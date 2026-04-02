import { runPerformanceTest } from '@tests/helpers/performanceTestHelper';
import { AlertManager, NotificationChannel } from '@src/monitoring/AlertManager';
import { HealthChecker, HealthCheckResult } from '@src/monitoring/HealthChecker';

describe('AlertManager Performance', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  let alertManager: AlertManager;
  let mockHealthChecker: jest.Mocked<HealthChecker>;
  let mockNotificationChannel: NotificationChannel;

  beforeEach(() => {
    mockHealthChecker = {
      performHealthCheck: jest.fn(),
    } as any;

    alertManager = new AlertManager(mockHealthChecker, {
      responseTimeThreshold: 100,
      consecutiveFailures: 0,
      cooldownPeriod: 0,
    });

    // Mock NotificationChannel with delay
    mockNotificationChannel = {
      name: 'delayed_channel',
      type: 'console',
      config: {},
      send: jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay per notification
        return true;
      }),
    };

    alertManager.addNotificationChannel(mockNotificationChannel);
  });

  afterEach(() => {
    alertManager.shutdown();
  });

  it('should measure optimized performance of processHealthCheck', async () => {
    const healthCheckResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 1000,
      memory: { used: 500, total: 1000, percentage: 50 },
      database: { status: 'connected' },
      services: {
        service1: { status: 'down', message: 'Down' },
        service2: { status: 'down', message: 'Down' },
        service3: { status: 'down', message: 'Down' },
        service4: { status: 'up', responseTime: 200 },
        service5: { status: 'up', responseTime: 200 },
        service6: { status: 'up', responseTime: 200 },
      },
      metrics: { diskUsage: 50, errorRate: 0 },
    };

    // We detect 3 down services and 3 slow services = 6 alerts
    // Each alert sends notification to 'console' (default) and 'delayed_channel'
    // 'console' is fast, 'delayed_channel' has 50ms delay.
    // Total alerts = 6.
    // Concurrent delay should be ~50ms (plus overhead) because all alerts are created concurrently,
    // and each alert sends its notifications concurrently.

    const result = await runPerformanceTest(
      'AlertManager.processHealthCheck - Concurrent',
      async () => {
        await (alertManager as any).processHealthCheck(healthCheckResult);
      },
      {
        iterations: 5,
        warmupIterations: 1,
      }
    );

    console.log(`Baseline Average Time: ${result.average}ms`);
  }, 30000);
});
