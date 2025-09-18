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

  beforeEach(async () => {
    const app = express();
    httpServer = createServer(app);

    mockManager = {
      getAllBots: jest.fn(),
      getWarnings: jest.fn()
    } as any;

    // Setup the mock instance
    mockBotConfigurationManager.getInstance.mockReturnValue(mockManager);

    // Create a promise to wait for server to start
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(0, () => { // Use port 0 to let the system assign a random port
        resolve(undefined);
      });
      
      // Handle server errors
      httpServer.on('error', reject);
    });

    const port = (httpServer.address() as any)?.port;
    wsService = WebSocketService.getInstance();
    wsService.initialize(httpServer);

    // Create a promise to wait for client connection with better error handling
    await new Promise<void>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('Client connection timeout'));
      }, 10000);

      clientSocket = Client(`http://localhost:${port}`, {
        path: '/webui/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
        forceNew: true
      });
      
      clientSocket.on('connect', () => {
        clearTimeout(connectionTimeout);
        resolve(undefined);
      });
      
      clientSocket.on('connect_error', (error: any) => {
        clearTimeout(connectionTimeout);
        reject(error);
      });
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    
    // Disconnect client socket with better cleanup
    if (clientSocket) {
      try {
        if (clientSocket.connected) {
          clientSocket.disconnect();
        }
        // Remove all event listeners to prevent memory leaks
        clientSocket.removeAllListeners();
      } catch (error) {
        // Silently ignore client socket errors
      }
    }
    
    // Give a moment for the disconnect to complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Shutdown WebSocket service
    if (wsService) {
      try {
        wsService.shutdown();
      } catch (error) {
        // Silently ignore WebSocket service shutdown errors
      }
    }
    
    // Reset the WebSocketService singleton instance
    (WebSocketService as any).instance = null;
    
    // Close HTTP server with timeout protection
    if (httpServer && httpServer.listening) {
      try {
        await new Promise((resolve) => {
          const closeTimeout = setTimeout(() => {
            // Force resolve after timeout
            resolve();
          }, 3000);
          
          httpServer.close((err) => {
            clearTimeout(closeTimeout);
            // Silently ignore close errors
            resolve();
          });
        });
      } catch (error) {
        // Silently ignore HTTP server close errors
      }
    }
  });

  describe('Connection Management', () => {
    it('should handle client connections', async () => {
      // Check if already connected from beforeEach setup
      expect(clientSocket.connected).toBe(true);
    }, 10000);

    it('should handle client disconnections', async () => {
      // Already connected from beforeEach, set up disconnect handler and trigger disconnect
      const disconnectPromise = new Promise((resolve) => {
        clientSocket.on('disconnect', () => {
          expect(clientSocket.connected).toBe(false);
          resolve();
        });
      });
      
      // Trigger disconnect
      clientSocket.disconnect();
      
      // Wait for disconnect to complete
      await disconnectPromise;
    }, 10000);
  });

  describe('Bot Status Updates', () => {
    it('should send bot status on request', async () => {
      mockManager.getAllBots.mockReturnValue([
        {
          id: 'test-bot',
          name: 'Test Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'test-token' }
        }
      ]);

      // Set up event listener with timeout protection
      const statusPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for bot_status_update'));
        }, 5000);

        clientSocket.once('bot_status_update', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      clientSocket.emit('request_bot_status');
      
      const data = await statusPromise;
      expect(data.bots).toHaveLength(1);
      expect(data.bots[0].name).toBe('Test Bot');
      expect(data.bots[0].provider).toBe('discord'); // The service maps messageProvider to provider
      expect(data.bots[0].llmProvider).toBe('openai');
    }, 10000);

    it('should handle bot status errors gracefully', async () => {
      // Mock getAllBots to throw an error
      mockManager.getAllBots.mockImplementation(() => {
        throw new Error('Failed to fetch bots');
      });

      // Set up event listener with timeout protection
      const errorPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for error event'));
        }, 5000);

        clientSocket.once('error', (error: any) => {
          clearTimeout(timeout);
          resolve(error);
        });
      });

      clientSocket.emit('request_bot_status');
      
      const error = await errorPromise;
      expect(error).toHaveProperty('message');
      expect(error.message).toBe('Failed to get bot status');
    }, 10000);
  });

  describe('System Metrics Updates', () => {
    it('should send system metrics on request', async () => {
      // Set up event listener with timeout protection
      const metricsPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for system_metrics_update'));
        }, 5000);

        clientSocket.once('system_metrics_update', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      clientSocket.emit('request_system_metrics');
      
      const data = await metricsPromise;
      expect(data).toHaveProperty('memory');
      expect(data).toHaveProperty('connectedClients');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('cpu');
    }, 10000);
  });

  describe('Configuration Validation', () => {
    it('should send configuration validation on request', async () => {
      mockManager.getAllBots.mockReturnValue([]);
      mockManager.getWarnings.mockReturnValue([]);

      // Set up event listener with timeout protection
      const validationPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for config_validation_update'));
        }, 5000);

        clientSocket.once('config_validation_update', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      clientSocket.emit('request_config_validation');
      
      const data = await validationPromise;
      expect(data).toHaveProperty('warnings');
      expect(Array.isArray(data.warnings)).toBe(true);
      expect(data).toHaveProperty('isValid');
      expect(data).toHaveProperty('botCount');
    }, 10000);

    it('should detect missing configurations', async () => {
      // Setup mock bot data that will trigger missing configuration detection
      mockManager.getAllBots.mockReturnValue([
        {
          id: 'test-bot',
          name: 'Test Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: '' } // Empty token should trigger missing config
        }
      ]);
      mockManager.getWarnings.mockReturnValue([]);

      // Set up event listener with timeout protection
      const validationPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for config_validation_update'));
        }, 5000);

        clientSocket.once('config_validation_update', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      clientSocket.emit('request_config_validation');
      
      const data = await validationPromise;
      expect(data).toHaveProperty('missingConfigs');
      expect(Array.isArray(data.missingConfigs)).toBe(true);
      // The service generates missing config messages in format "BotName: Missing Discord bot token"
      expect(data.missingConfigs.some((config: string) => config.includes('Missing Discord bot token'))).toBe(true);
    }, 10000);

    it('should generate recommendations', async () => {
      // Setup mock bot data that will trigger recommendations
      mockManager.getAllBots.mockReturnValue([
        {
          id: 'test-bot',
          name: 'Test Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'test-token' }
        }
      ]);
      mockManager.getWarnings.mockReturnValue([]);

      // Set up event listener with timeout protection
      const validationPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for config_validation_update'));
        }, 5000);

        clientSocket.once('config_validation_update', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      clientSocket.emit('request_config_validation');
      
      const data = await validationPromise;
      expect(data).toHaveProperty('recommendations');
      expect(Array.isArray(data.recommendations)).toBe(true);
      // The service generates recommendations like "Consider adding Slack integration..."
      expect(data.recommendations.some((rec: string) => rec.includes('Consider'))).toBe(true);
    }, 10000);
  });

  describe('Configuration Change Broadcasting', () => {
    it('should broadcast configuration changes', async () => {
      // Set up event listener with timeout protection
      const configPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for config_changed'));
        }, 5000);

        clientSocket.once('config_changed', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      wsService.broadcastConfigChange();
      
      const data = await configPromise;
      expect(data).toHaveProperty('timestamp');
    }, 10000);

    it('should send updated bot status after configuration change', async () => {
      mockManager.getAllBots.mockReturnValue([
        {
          id: 'test-bot',
          name: 'Test Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'test-token' }
        }
      ]);

      // Set up event listener with timeout protection
      const statusPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for bot_status_update'));
        }, 5000);

        clientSocket.once('bot_status_update', (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });

      // Use the proper public method to broadcast config change
      wsService.broadcastConfigChange();
      
      const data = await statusPromise;
      expect(data).toHaveProperty('bots');
      expect(data).toHaveProperty('timestamp');
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle configuration validation errors', async () => {
      // Mock getWarnings to throw an error
      mockManager.getWarnings.mockImplementation(() => {
        throw new Error('Validation error');
      });

      // Set up event listener with timeout protection
      const errorPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Test timed out waiting for error event'));
        }, 5000);

        clientSocket.once('error', (error: any) => {
          clearTimeout(timeout);
          resolve(error);
        });
      });

      clientSocket.emit('request_config_validation');
      
      const error = await errorPromise;
      expect(error).toHaveProperty('message');
      expect(error.message).toBe('Failed to validate configuration');
    }, 10000);

    it('should handle system metrics errors gracefully', async () => {
      // Mock process.memoryUsage to throw an error
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => {
        throw new Error('Memory error');
      }) as any;

      // Set up event listener with timeout protection
      const errorPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Restore original function
          process.memoryUsage = originalMemoryUsage;
          reject(new Error('Test timed out waiting for error event'));
        }, 5000);

        clientSocket.once('error', (error: any) => {
          clearTimeout(timeout);
          resolve(error);
        });
      });

      clientSocket.emit('request_system_metrics');
      
      const error = await errorPromise;
      expect(error).toHaveProperty('message');
      expect(error.message).toBe('Failed to get system metrics');
      
      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    }, 10000);
  });

  describe('Service Lifecycle', () => {
    it('should initialize and shutdown properly', () => {
      expect(wsService).toBeDefined();
      expect(() => wsService.initialize(httpServer)).not.toThrow();
      expect(() => wsService.shutdown()).not.toThrow();
    }, 10000);

    it('should handle multiple clients', async () => {
      const port = (httpServer.address() as any)?.port;
      
      // Create second client
      const clientSocket2 = Client(`http://localhost:${port}`, {
        path: '/webui/socket.io',
        transports: ['websocket'],
        reconnection: false,
        timeout: 5000,
        forceNew: true
      });

      // Set up connection promise for second client
      const connectPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Second client connection timeout'));
        }, 5000);

        clientSocket2.on('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        clientSocket2.on('connect_error', (error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Wait for second client to connect
      await connectPromise;

      // Verify both clients are connected
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket2.connected).toBe(true);

      // Clean up second client
      clientSocket2.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
    }, 10000);
  });
});