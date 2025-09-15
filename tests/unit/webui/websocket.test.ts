import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import WebSocketService from '@src/webui/services/WebSocketService';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { io as Client } from 'socket.io-client';

// Mock BotConfigurationManager
jest.mock('@config/BotConfigurationManager');
const mockBotConfigurationManager = BotConfigurationManager as jest.MockedClass<typeof BotConfigurationManager>;

describe('WebSocketService', () => {
  let httpServer: HttpServer;
  let wsService: WebSocketService;
  let clientSocket: any;
  let mockManager: jest.Mocked<BotConfigurationManager>;

  beforeEach((done) => {
    const app = express();
    httpServer = createServer(app);

    mockManager = {
      getAllBots: jest.fn(),
      getWarnings: jest.fn()
    } as any;

    mockBotConfigurationManager.getInstance.mockReturnValue(mockManager);

    httpServer.listen(() => {
      const port = (httpServer.address() as any)?.port;
      wsService = WebSocketService.getInstance();
      wsService.initialize(httpServer);

      clientSocket = Client(`http://localhost:${port}`, {
        path: '/webui/socket.io'
      });
      clientSocket.on('connect', done);
      clientSocket.on('connect_error', () => {});
    });
  });

  afterEach((done) => {
    wsService.shutdown();
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    httpServer.close(done);
  });

  describe('Connection Management', () => {
    it('should handle client connections', (done) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    it('should handle client disconnections', (done) => {
      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
      });
    });
  });

  describe('Bot Status Updates', () => {
    it('should send bot status on request', (done) => {
      mockManager.getAllBots.mockResolvedValue([
        {
          id: 'test-bot',
          name: 'Test Bot',
          provider: 'discord',
          llmProvider: 'openai',
          isActive: true,
          lastModified: new Date().toISOString()
        }
      ]);

      clientSocket.on('bot_status', (data: any) => {
        expect(data).toHaveLength(1);
        expect(data[0].name).toBe('Test Bot');
        done();
      });

      clientSocket.emit('request_bot_status');
    });

    it('should handle bot status errors gracefully', (done) => {
      mockManager.getAllBots.mockRejectedValue(new Error('Failed to fetch bots'));

      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message');
        done();
      });

      clientSocket.emit('request_bot_status');
    });
  });

  describe('System Metrics Updates', () => {
    it('should send system metrics on request', (done) => {
      clientSocket.on('system_metrics', (data: any) => {
        expect(data).toHaveProperty('cpu');
        expect(data).toHaveProperty('memory');
        expect(data).toHaveProperty('uptime');
        done();
      });

      clientSocket.emit('request_system_metrics');
    });
  });

  describe('Configuration Validation', () => {
    it('should send configuration validation on request', (done) => {
      mockManager.getWarnings.mockResolvedValue([]);

      clientSocket.on('config_validation', (data: any) => {
        expect(Array.isArray(data)).toBe(true);
        done();
      });

      clientSocket.emit('request_config_validation');
    });

    it('should detect missing configurations', (done) => {
      mockManager.getWarnings.mockResolvedValue(['Missing DISCORD_BOT_TOKEN']);

      clientSocket.on('config_validation', (data: any) => {
        expect(data).toContain('Missing DISCORD_BOT_TOKEN');
        done();
      });

      clientSocket.emit('request_config_validation');
    });

    it('should generate recommendations', (done) => {
      mockManager.getWarnings.mockResolvedValue(['Consider setting DISCORD_JOIN_CHANNELS']);

      clientSocket.on('recommendations', (data: any) => {
        expect(data).toContain('Consider setting DISCORD_JOIN_CHANNELS');
        done();
      });

      clientSocket.emit('request_recommendations');
    });
  });

  describe('Configuration Change Broadcasting', () => {
    it('should broadcast configuration changes', (done) => {
      clientSocket.on('config_changed', (data: any) => {
        expect(data).toHaveProperty('message');
        done();
      });

      wsService.broadcastConfigChange();
    });

    it('should send updated data after configuration change', (done) => {
      mockManager.getAllBots.mockResolvedValue([]);

      clientSocket.on('updated_data', (data: any) => {
        expect(data).toHaveProperty('bots');
        expect(Array.isArray(data.bots)).toBe(true);
        done();
      });

      wsService.sendUpdatedData();
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration validation errors', (done) => {
      // Track if done has been called to prevent multiple calls
      let doneCalled = false;
      
      mockManager.getWarnings.mockRejectedValue(new Error('Validation error'));

      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message');
        if (!doneCalled) {
          doneCalled = true;
          done();
        }
      });

      clientSocket.emit('request_config_validation');
    });

    it('should handle system metrics errors gracefully', (done) => {
      // Track if done has been called to prevent multiple calls
      let doneCalled = false;
      
      // Mock process.memoryUsage to throw an error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory error');
      }) as any;

      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message', 'Failed to get system metrics');
        
        // Restore original function
        process.memoryUsage = originalMemoryUsage;
        
        if (!doneCalled) {
          doneCalled = true;
          done();
        }
      });

      clientSocket.emit('request_system_metrics');
    });
  });

  describe('Service Lifecycle', () => {
    it('should initialize and shutdown properly', () => {
      expect(wsService).toBeDefined();
      expect(() => wsService.initialize(httpServer)).not.toThrow();
      expect(() => wsService.shutdown()).not.toThrow();
    });

    it('should handle multiple clients', (done) => {
      const clientSocket2 = Client(`http://localhost:${(httpServer.address() as any)?.port}`, {
        path: '/webui/socket.io'
      });

      let connectedClients = 0;

      const checkDone = () => {
        connectedClients++;
        if (connectedClients === 2) {
          clientSocket2.disconnect();
          done();
        }
      };

      clientSocket.on('connect', checkDone);
      clientSocket2.on('connect', checkDone);
    });
  });
});