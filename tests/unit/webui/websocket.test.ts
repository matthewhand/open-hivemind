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
    
    wsService = WebSocketService.getInstance();
    wsService.initialize(httpServer);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any)?.port;
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
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should handle client disconnections', (done) => {
      clientSocket.on('disconnect', () => {
        done();
      });
      clientSocket.disconnect();
    });
  });

  describe('Bot Status Updates', () => {
    it('should send bot status on request', (done) => {
      const mockBots = [
        {
          name: 'TestBot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'test-token', voiceChannelId: '123' },
          openai: { apiKey: 'sk-test' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);

      clientSocket.on('bot_status_update', (data: any) => {
        expect(data).toHaveProperty('bots');
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('active');
        
        expect(data.bots).toHaveLength(1);
        expect(data.bots[0]).toHaveProperty('name', 'TestBot');
        expect(data.bots[0]).toHaveProperty('provider', 'discord');
        expect(data.bots[0]).toHaveProperty('llmProvider', 'openai');
        expect(data.bots[0]).toHaveProperty('capabilities');
        expect(data.bots[0].capabilities).toHaveProperty('voiceSupport', true);
        expect(data.bots[0].capabilities).toHaveProperty('hasSecrets', true);
        
        expect(data.total).toBe(1);
        expect(data.active).toBe(1);
        
        done();
      });

      clientSocket.emit('request_bot_status');
    });

    it('should handle bot status errors gracefully', (done) => {
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Bot status error');
      });

      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message', 'Failed to get bot status');
        done();
      });

      clientSocket.emit('request_bot_status');
    });
  });

  describe('System Metrics Updates', () => {
    it('should send system metrics on request', (done) => {
      clientSocket.on('system_metrics_update', (data: any) => {
        expect(data).toHaveProperty('uptime');
        expect(data).toHaveProperty('memory');
        expect(data).toHaveProperty('cpu');
        expect(data).toHaveProperty('connectedClients');
        expect(data).toHaveProperty('timestamp');
        
        expect(data.memory).toHaveProperty('used');
        expect(data.memory).toHaveProperty('total');
        expect(data.memory).toHaveProperty('external');
        expect(data.memory).toHaveProperty('rss');
        
        expect(typeof data.uptime).toBe('number');
        expect(typeof data.memory.used).toBe('number');
        expect(data.connectedClients).toBeGreaterThan(0);
        
        done();
      });

      clientSocket.emit('request_system_metrics');
    });
  });

  describe('Configuration Validation', () => {
    it('should send configuration validation on request', (done) => {
      const mockBots = [
        {
          name: 'ValidBot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'valid-token' },
          openai: { apiKey: 'sk-valid' }
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue([]);

      clientSocket.on('config_validation_update', (data: any) => {
        expect(data).toHaveProperty('isValid');
        expect(data).toHaveProperty('warnings');
        expect(data).toHaveProperty('botCount');
        expect(data).toHaveProperty('missingConfigs');
        expect(data).toHaveProperty('recommendations');
        expect(data).toHaveProperty('timestamp');
        
        expect(data.isValid).toBe(true);
        expect(data.botCount).toBe(1);
        expect(Array.isArray(data.warnings)).toBe(true);
        expect(Array.isArray(data.missingConfigs)).toBe(true);
        expect(Array.isArray(data.recommendations)).toBe(true);
        
        done();
      });

      clientSocket.emit('request_config_validation');
    });

    it('should detect missing configurations', (done) => {
      const mockBots = [
        {
          name: 'IncompleteBot',
          messageProvider: 'discord',
          llmProvider: 'openai'
          // Missing discord and openai configurations
        }
      ];
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue(['Test warning']);

      clientSocket.on('config_validation_update', (data: any) => {
        expect(data.isValid).toBe(false);
        expect(data.warnings).toContain('Test warning');
        expect(data.missingConfigs.length).toBeGreaterThan(0);
        expect(data.missingConfigs.some((config: string) => 
          config.includes('Missing Discord bot token')
        )).toBe(true);
        expect(data.missingConfigs.some((config: string) => 
          config.includes('Missing OpenAI API key')
        )).toBe(true);
        
        done();
      });

      clientSocket.emit('request_config_validation');
    });

    it('should generate recommendations', (done) => {
      const mockBots: any[] = []; // Empty bots array
      
      mockManager.getAllBots.mockReturnValue(mockBots);
      mockManager.getWarnings.mockReturnValue([]);

      clientSocket.on('config_validation_update', (data: any) => {
        expect(data.recommendations.length).toBeGreaterThan(0);
        expect(data.recommendations.some((rec: string) => 
          rec.includes('No bots configured')
        )).toBe(true);
        
        done();
      });

      clientSocket.emit('request_config_validation');
    });
  });

  describe('Configuration Change Broadcasting', () => {
    it('should broadcast configuration changes', (done) => {
      clientSocket.on('config_changed', (data: any) => {
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('string');
        done();
      });

      wsService.broadcastConfigChange();
    });

    it('should send updated data after configuration change', (done) => {
      let updateCount = 0;
      const expectedUpdates = 2; // bot_status_update and config_validation_update

      const handleUpdate = () => {
        updateCount++;
        if (updateCount === expectedUpdates) {
          done();
        }
      };

      mockManager.getAllBots.mockReturnValue([]);
      mockManager.getWarnings.mockReturnValue([]);

      clientSocket.on('bot_status_update', handleUpdate);
      clientSocket.on('config_validation_update', handleUpdate);

      wsService.broadcastConfigChange();
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration validation errors', (done) => {
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Validation error');
      });

      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message', 'Failed to validate configuration');
        done();
      });

      clientSocket.emit('request_config_validation');
    });

    it('should handle system metrics errors gracefully', (done) => {
      // Mock process.memoryUsage to throw an error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory error');
      }) as any;

      clientSocket.on('error', (error: any) => {
        expect(error).toHaveProperty('message', 'Failed to get system metrics');
        
        // Restore original function
        process.memoryUsage = originalMemoryUsage;
        done();
      });

      clientSocket.emit('request_system_metrics');
    });
  });

  describe('Service Lifecycle', () => {
    it('should initialize and shutdown properly', () => {
      expect(wsService).toBeDefined();
      expect(() => wsService.shutdown()).not.toThrow();
    });

    it('should handle multiple clients', (done) => {
      const secondClient = Client(`http://localhost:${(httpServer.address() as any)?.port}`, {
        path: '/webui/socket.io'
      });

      secondClient.on('connect', () => {
        expect(secondClient.connected).toBe(true);
        secondClient.disconnect();
        done();
      });
    });
  });
});