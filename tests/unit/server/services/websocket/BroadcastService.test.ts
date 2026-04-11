import { BroadcastService } from '../../../../../src/server/services/websocket/BroadcastService';
import { DeliveryStatus } from '../../../../../src/types/websocket';
import { BotConfigurationManager } from '../../../../../src/config/BotConfigurationManager';
import { ActivityLogger } from '../../../../../src/server/services/ActivityLogger';
import { BotMetricsService } from '../../../../../src/server/services/BotMetricsService';

jest.mock('../../../../../src/config/BotConfigurationManager');
jest.mock('../../../../../src/server/services/ActivityLogger');
jest.mock('../../../../../src/server/services/BotMetricsService');

describe('websocket/BroadcastService', () => {
  let connectionManager: any;
  let apiMonitorService: any;
  let io: any;
  let socket: any;
  const apiCallbacks: Record<string, Function> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    socket = { emit: jest.fn() };

    io = {
      emit: jest.fn(),
      sockets: {
        sockets: new Map([['s1', socket]]),
      },
    };

    connectionManager = {
      getIo: jest.fn(() => io),
      getConnectedClients: jest.fn(() => 1),
    };

    apiMonitorService = {
      on: jest.fn((event: string, cb: Function) => {
        apiCallbacks[event] = cb;
      }),
      syncLlmEndpoints: jest.fn(),
      startAllMonitoring: jest.fn(),
      getAllStatuses: jest.fn(() => []),
      getOverallHealth: jest.fn(() => ({ status: 'healthy' })),
      getAllEndpoints: jest.fn(() => []),
    };

    (ActivityLogger.getInstance as jest.Mock).mockReturnValue({ log: jest.fn() });
    (BotMetricsService.getInstance as jest.Mock).mockReturnValue({
      incrementMessageCount: jest.fn(),
      incrementErrorCount: jest.fn(),
      getMetrics: jest.fn(() => ({ messageCount: 0, errorCount: 0 })),
      getAllMetrics: jest.fn(() => ({})),
    });

    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue({
      getAllBots: jest.fn(() => []),
      getWarnings: jest.fn(() => []),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets up API monitoring callbacks on construction', () => {
    new BroadcastService(connectionManager, apiMonitorService);

    expect(apiMonitorService.on).toHaveBeenCalledWith('statusUpdate', expect.any(Function));
    expect(apiMonitorService.on).toHaveBeenCalledWith('healthCheckResult', expect.any(Function));
    expect(apiMonitorService.syncLlmEndpoints).toHaveBeenCalled();
    expect(apiMonitorService.startAllMonitoring).toHaveBeenCalled();
  });

  it('handles API status update and records alert for error/offline status', () => {
    new BroadcastService(connectionManager, apiMonitorService);

    apiCallbacks.statusUpdate({
      id: 'ep-1',
      name: 'OpenAI',
      status: 'error',
      url: 'http://x',
      errorMessage: 'boom',
      responseTime: 500,
      consecutiveFailures: 2,
    });

    expect(io.emit).toHaveBeenCalledWith(
      'api_status_update',
      expect.objectContaining({ endpoint: expect.objectContaining({ name: 'OpenAI' }) })
    );
    expect(io.emit).toHaveBeenCalledWith(
      'alert_update',
      expect.objectContaining({ title: expect.stringContaining('API Endpoint ERROR') })
    );
  });

  it('sendBotStatus emits bot capabilities and active status', () => {
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue({
      getAllBots: jest.fn(() => [
        {
          name: 'alpha',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'token', voiceChannelId: 'vc1' },
          openai: { apiKey: 'k' },
        },
      ]),
      getWarnings: jest.fn(() => []),
    });

    const service = new BroadcastService(connectionManager, apiMonitorService);
    service.sendBotStatus(socket);

    expect(socket.emit).toHaveBeenCalledWith(
      'bot_status_update',
      expect.objectContaining({
        total: 1,
        active: 1,
        bots: expect.arrayContaining([
          expect.objectContaining({
            name: 'alpha',
            status: 'active',
            capabilities: expect.objectContaining({ voiceSupport: true, hasSecrets: true }),
          }),
        ]),
      })
    );
  });

  it('sendConfigValidation emits error event when manager fails', () => {
    (BotConfigurationManager.getInstance as jest.Mock).mockImplementation(() => {
      throw new Error('config failure');
    });

    const service = new BroadcastService(connectionManager, apiMonitorService);
    service.sendConfigValidation(socket);

    expect(socket.emit).toHaveBeenCalledWith('error', {
      message: 'Failed to validate configuration',
    });
  });

  it('retries tracked messages then marks timed out after max retries', () => {
    const service = new BroadcastService(connectionManager, apiMonitorService);
    service.configureAck({ enabled: true, messageTimeoutMs: 10, maxRetries: 1 });

    const envelope = service.sendTrackedMessage('evt', { ok: true }, 'chan');
    expect(envelope.status).toBe(DeliveryStatus.SENT);

    jest.advanceTimersByTime(25);

    const stats = service.getDeliveryStats();
    expect(stats.totalTimedOut).toBe(1);
    expect(stats.pendingCount).toBe(0);
    // initial send + one retry
    expect(stats.totalSent).toBe(2);
  });

  it('broadcastMonitoringData tolerates bot stats aggregation failure', () => {
    const service = new BroadcastService(connectionManager, apiMonitorService);
    jest.spyOn(service as any, 'getAllBotStats').mockImplementation(() => {
      throw new Error('stats fail');
    });

    service.recordMessageFlow({
      botName: 'b1',
      provider: 'discord',
      channelId: 'c1',
      userId: 'u1',
      messageType: 'incoming',
      contentLength: 10,
      status: 'success',
    });

    expect(() => service.broadcastMonitoringData(1)).not.toThrow();
    expect(io.emit).toHaveBeenCalledWith(
      'performance_metrics_broadcast',
      expect.objectContaining({ current: expect.any(Object) })
    );
  });
});
