import { WebSocketService } from '../../../../src/server/services/WebSocketService';

describe('WebSocketService facade + scheduler behavior', () => {
  let connectionManager: any;
  let broadcastService: any;
  let eventHandlers: any;
  let io: any;
  let service: WebSocketService;

  beforeEach(() => {
    jest.useFakeTimers();

    io = { on: jest.fn(), emit: jest.fn(), sockets: { sockets: new Map() } };

    connectionManager = {
      initialize: jest.fn(() => io),
      getIo: jest.fn(() => io),
      getConnectedClients: jest.fn(() => 1),
      shutdown: jest.fn(),
      setIo: jest.fn(),
      setConnectedClients: jest.fn(),
    };

    broadcastService = {
      getApiMonitorService: jest.fn(),
      setApiMonitorService: jest.fn(),
      recordMessageFlow: jest.fn(),
      recordAlert: jest.fn(),
      getMessageFlow: jest.fn(() => []),
      getAlerts: jest.fn(() => []),
      acknowledgeAlert: jest.fn(() => true),
      resolveAlert: jest.fn(() => true),
      getPerformanceMetrics: jest.fn(() => []),
      getMessageRateHistory: jest.fn(() => [0]),
      getErrorRateHistory: jest.fn(() => [0]),
      getBotStats: jest.fn(() => ({ messageCount: 0, errors: [], errorCount: 0 })),
      getAllBotStats: jest.fn(() => ({})),
      broadcastConfigChange: jest.fn(),
      configureAck: jest.fn(),
      sendTrackedMessage: jest.fn(() => ({ messageId: 'm1', sequenceNumber: 1 })),
      handleAck: jest.fn(() => true),
      handleRequestMissed: jest.fn(() => []),
      getDeliveryStats: jest.fn(() => ({
        totalSent: 0,
        totalAcknowledged: 0,
        totalTimedOut: 0,
        totalFailed: 0,
        pendingCount: 0,
        averageAckLatencyMs: 0,
        deliverySuccessRate: 0,
      })),
      getSequenceNumber: jest.fn(() => 0),
      broadcastBotStatus: jest.fn(),
      broadcastSystemMetrics: jest.fn(),
      broadcastMonitoringData: jest.fn(),
      shutdown: jest.fn(),
    };

    eventHandlers = {
      setup: jest.fn(),
    };

    service = new WebSocketService(connectionManager, broadcastService, eventHandlers);
  });

  afterEach(() => {
    service.shutdown();
    jest.useRealTimers();
  });

  it('initialize wires manager + handlers and starts periodic broadcasting', () => {
    service.initialize({} as any);

    expect(connectionManager.initialize).toHaveBeenCalled();
    expect(eventHandlers.setup).toHaveBeenCalledWith(io);

    jest.advanceTimersByTime(5000);
    expect(broadcastService.broadcastBotStatus).toHaveBeenCalledTimes(1);
    expect(broadcastService.broadcastSystemMetrics).toHaveBeenCalledWith(1);
    expect(broadcastService.broadcastMonitoringData).toHaveBeenCalledWith(1);
  });

  it('periodic broadcasting is skipped when there are no connected clients', () => {
    connectionManager.getConnectedClients.mockReturnValue(0);
    service.initialize({} as any);

    jest.advanceTimersByTime(5000);
    expect(broadcastService.broadcastBotStatus).not.toHaveBeenCalled();
    expect(broadcastService.broadcastSystemMetrics).not.toHaveBeenCalled();
    expect(broadcastService.broadcastMonitoringData).not.toHaveBeenCalled();
  });

  it('delegates public facade methods to BroadcastService', () => {
    service.recordMessageFlow({
      botName: 'b1',
      provider: 'discord',
      channelId: 'c1',
      userId: 'u1',
      messageType: 'incoming',
      contentLength: 3,
      status: 'success',
    });
    service.recordAlert({ level: 'warning', title: 'warn', message: 'msg' });
    service.broadcastConfigChange({ type: 'config' });
    service.configureAck({ enabled: true });
    service.sendTrackedMessage('evt', { ok: true }, 'chan');
    service.handleAck({ messageId: 'm1' });
    service.handleRequestMissed({ channel: 'chan', lastSequence: 1 });
    service.getDeliveryStats();
    service.getSequenceNumber('chan');

    expect(broadcastService.recordMessageFlow).toHaveBeenCalled();
    expect(broadcastService.recordAlert).toHaveBeenCalled();
    expect(broadcastService.broadcastConfigChange).toHaveBeenCalledWith({ type: 'config' });
    expect(broadcastService.configureAck).toHaveBeenCalledWith({ enabled: true });
    expect(broadcastService.sendTrackedMessage).toHaveBeenCalledWith('evt', { ok: true }, 'chan');
    expect(broadcastService.handleAck).toHaveBeenCalledWith({ messageId: 'm1' });
    expect(broadcastService.handleRequestMissed).toHaveBeenCalledWith({
      channel: 'chan',
      lastSequence: 1,
    });
    expect(broadcastService.getDeliveryStats).toHaveBeenCalled();
    expect(broadcastService.getSequenceNumber).toHaveBeenCalledWith('chan');
  });

  it('shutdown clears interval and delegates shutdown calls', () => {
    service.initialize({} as any);
    service.shutdown();

    expect(connectionManager.shutdown).toHaveBeenCalled();
    expect(broadcastService.shutdown).toHaveBeenCalled();

    jest.advanceTimersByTime(10000);
    // still one call max from before shutdown tick, no additional periodic calls
    expect(broadcastService.broadcastBotStatus.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
