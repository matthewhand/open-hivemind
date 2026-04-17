import 'reflect-metadata';
import { WebSocketService } from '../../../src/server/services/websocket';
import { container } from 'tsyringe';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { registerServices } from '../../../src/di/registration';

describe('WebSocketService High Quality Integration', () => {
  let ioService: WebSocketService;
  let mockIo: any;
  let mockSocket: any;

  beforeAll(() => {
    registerServices();
    
    mockSocket = {
      id: 'test-socket',
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn()
    };

    mockIo = {
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      sockets: {
        emit: jest.fn(),
        sockets: new Map([['test-socket', mockSocket]])
      }
    };

    // Override DatabaseManager with a safe mock
    container.registerInstance(DatabaseManager as any, {
      isConfigured: jest.fn().mockReturnValue(true),
      getInstance: jest.fn().mockReturnThis()
    } as any);

    ioService = container.resolve(WebSocketService);
    // Directly inject the mock IO to avoid real server startup issues
    (ioService as any).io = mockIo;
  });

  it('should correctly broadcast message flow to all clients', () => {
    const event = {
      botName: 'test-bot',
      provider: 'discord',
      channelId: 'ch1',
      userId: 'u1',
      messageType: 'incoming' as any,
      contentLength: 100,
      status: 'success' as any
    };

    // Need to have "connected clients" > 0 for broadcast to happen
    (ioService as any).connectionManager.getConnectedClients = jest.fn().mockReturnValue(1);

    ioService.recordMessageFlow(event);
    
    // BroadcastService emits 'message_flow_update'
    expect(mockIo.emit).toHaveBeenCalledWith('message_flow_update', expect.objectContaining({
      botName: 'test-bot',
      contentLength: 100
    }));
  });

  it('should handle configuration change broadcasts', () => {
    const detail = { type: 'bot', action: 'update', key: 'bot-1' };
    
    (ioService as any).connectionManager.getConnectedClients = jest.fn().mockReturnValue(1);
    
    ioService.broadcastConfigChange(detail);
    
    // BroadcastService emits 'config_changed'
    expect(mockIo.emit).toHaveBeenCalledWith('config_changed', expect.objectContaining(detail));
  });

  it('should provide bot statistics aggregated from message flow', () => {
    // Record multiple messages for a bot
    const botName = 'stats-bot';
    for(let i=0; i<3; i++) {
      ioService.recordMessageFlow({
        botName,
        provider: 'slack',
        channelId: 'c1',
        userId: 'u1',
        messageType: 'incoming',
        contentLength: 10,
        status: 'success'
      });
    }

    const stats = ioService.getBotStats(botName);
    expect(stats.messageCount).toBeGreaterThanOrEqual(3);
  });
});
