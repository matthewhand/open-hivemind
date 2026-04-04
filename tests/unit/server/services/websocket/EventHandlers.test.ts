import { EventHandlers } from '../../../../../src/server/services/websocket/EventHandlers';

describe('websocket/EventHandlers', () => {
  let connectionManager: any;
  let broadcastService: any;
  let handlers: EventHandlers;
  let io: any;
  let socket: any;

  beforeEach(() => {
    connectionManager = {
      incrementClients: jest.fn(),
      decrementClients: jest.fn(),
      getConnectedClients: jest.fn().mockReturnValue(1),
    };

    broadcastService = {
      sendBotStatus: jest.fn(),
      sendSystemMetrics: jest.fn(),
      sendConfigValidation: jest.fn(),
      sendMessageFlow: jest.fn(),
      sendAlerts: jest.fn(),
      sendPerformanceMetrics: jest.fn(),
      sendMonitoringDashboard: jest.fn(),
      sendApiStatus: jest.fn(),
      sendApiEndpoints: jest.fn(),
      handleAck: jest.fn(),
      handleRequestMissed: jest.fn().mockReturnValue([{ sequenceNumber: 2 }]),
    };

    handlers = new EventHandlers(connectionManager, broadcastService);

    socket = {
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    io = {
      on: jest.fn((event: string, cb: Function) => {
        if (event === 'connection') {
          cb(socket);
        }
      }),
    };
  });

  it('registers connection handler and wires all socket events', () => {
    handlers.setup(io as any);

    expect(connectionManager.incrementClients).toHaveBeenCalled();
    expect(broadcastService.sendBotStatus).toHaveBeenCalledWith(socket);
    expect(broadcastService.sendSystemMetrics).toHaveBeenCalledWith(socket, 1);
    expect(socket.on).toHaveBeenCalledWith('request_bot_status', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_system_metrics', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_config_validation', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_message_flow', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_alerts', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_performance_metrics', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_monitoring_dashboard', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_api_status', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_api_endpoints', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('ack', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('request_missed', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('forwards ack and request_missed events to broadcast service', () => {
    handlers.setup(io as any);

    const ackHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'ack')[1];
    ackHandler({ messageId: 'm1' });
    expect(broadcastService.handleAck).toHaveBeenCalledWith({ messageId: 'm1' });

    const missedHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'request_missed')[1];
    missedHandler({ channel: 'chan', lastSequence: 1 });
    expect(broadcastService.handleRequestMissed).toHaveBeenCalledWith({
      channel: 'chan',
      lastSequence: 1,
    });
    expect(socket.emit).toHaveBeenCalledWith('missed_messages', {
      channel: 'chan',
      messages: [{ sequenceNumber: 2 }],
    });
  });

  it('decrements clients and removes listeners on disconnect', () => {
    handlers.setup(io as any);

    const disconnectHandler = socket.on.mock.calls.find((c: any[]) => c[0] === 'disconnect')[1];
    disconnectHandler();

    expect(connectionManager.decrementClients).toHaveBeenCalled();
    expect(socket.removeAllListeners).toHaveBeenCalled();
  });
});
