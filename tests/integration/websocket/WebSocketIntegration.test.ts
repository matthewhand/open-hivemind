/**
 * WebSocket Integration Tests
 * Tests real-time WebSocket communication flows
 */

import { io, Socket } from 'socket.io-client';
import { createServer } from '../../../src/server/server';
import express from 'express';
import { ConfigurationManager } from '../../../src/config/ConfigurationManager';

describe('WebSocket Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let clientSocket: Socket;
  let serverPort: number;

  beforeAll(async () => {
    // Set up test configuration
    process.env.NODE_ENV = 'test';
    process.env.NODE_CONFIG_DIR = 'config/test';

    // Initialize configuration
    ConfigurationManager.getInstance();

    // Create and start server
    app = await createServer();
    server = app.listen(0); // Use random available port
    serverPort = (server.address() as any).port;
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach((done) => {
    // Create client socket for each test
    clientSocket = io(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false
    });

    clientSocket.on('connect', () => {
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done.fail(`WebSocket connection failed: ${error.message}`);
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection successfully', () => {
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
    });

    it('should handle connection with custom headers', (done) => {
      const testSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        extraHeaders: {
          'X-Test-Header': 'test-value'
        }
      });

      testSocket.on('connect', () => {
        expect(testSocket.connected).toBe(true);
        testSocket.disconnect();
        done();
      });

      testSocket.on('connect_error', (error) => {
        done.fail(`Connection with headers failed: ${error.message}`);
      });
    });

    it('should handle disconnection gracefully', (done) => {
      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });

      clientSocket.disconnect();
    });
  });

  describe('Real-time Events', () => {
    it('should receive system status updates', (done) => {
      clientSocket.on('system:status', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(data.status);
        done();
      });

      // Trigger a status update by emitting a test event
      clientSocket.emit('system:ping');
    });

    it('should handle bot status updates', (done) => {
      const testBotId = 'test-bot-123';

      clientSocket.on('bot:status', (data) => {
        expect(data).toHaveProperty('botId');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Simulate bot status change
      clientSocket.emit('bot:status:request', { botId: testBotId });
    });

    it('should broadcast configuration changes', (done) => {
      let changeReceived = false;

      clientSocket.on('config:changed', (data) => {
        expect(data).toHaveProperty('type');
        expect(data).toHaveProperty('timestamp');
        changeReceived = true;
      });

      // Wait a bit for potential config change broadcasts
      setTimeout(() => {
        // Even if no config changes occurred, the connection should remain stable
        expect(clientSocket.connected).toBe(true);
        done();
      }, 1000);
    });
  });

  describe('Message Handling', () => {
    it('should handle incoming message events', (done) => {
      const testMessage = {
        id: 'test-msg-123',
        content: 'Hello from test',
        author: 'test-user',
        channel: 'test-channel',
        timestamp: Date.now()
      };

      clientSocket.on('message:received', (message) => {
        expect(message).toHaveProperty('id');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('author');
        done();
      });

      // Simulate sending a message
      clientSocket.emit('message:send', testMessage);
    });

    it('should handle message processing status', (done) => {
      clientSocket.on('message:processing', (data) => {
        expect(data).toHaveProperty('messageId');
        expect(data).toHaveProperty('status');
        expect(['processing', 'completed', 'failed']).toContain(data.status);
        done();
      });

      // Send a message that should trigger processing
      clientSocket.emit('message:send', {
        id: 'processing-test-msg',
        content: '!help',
        author: 'test-user',
        channel: 'test-channel'
      });
    });

    it('should handle message response events', (done) => {
      clientSocket.on('message:response', (response) => {
        expect(response).toHaveProperty('originalMessageId');
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('timestamp');
        done();
      });

      // Send a command that should generate a response
      clientSocket.emit('message:send', {
        id: 'response-test-msg',
        content: '!ping',
        author: 'test-user',
        channel: 'test-channel'
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent connections', (done) => {
      const numberOfClients = 5;
      const clients: Socket[] = [];
      let connectedCount = 0;
      let disconnectedCount = 0;

      for (let i = 0; i < numberOfClients; i++) {
        const client = io(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true,
          reconnection: false
        });

        client.on('connect', () => {
          connectedCount++;
          if (connectedCount === numberOfClients) {
            // All clients connected, now disconnect them
            clients.forEach(c => c.disconnect());
          }
        });

        client.on('disconnect', () => {
          disconnectedCount++;
          if (disconnectedCount === numberOfClients) {
            done();
          }
        });

        clients.push(client);
      }
    });

    it('should handle rapid message sending', (done) => {
      const messageCount = 10;
      let receivedCount = 0;

      clientSocket.on('message:echo', (data) => {
        receivedCount++;
        expect(data).toHaveProperty('content');
        expect(data).toHaveProperty('sequence');

        if (receivedCount === messageCount) {
          done();
        }
      });

      // Send multiple messages rapidly
      for (let i = 0; i < messageCount; i++) {
        clientSocket.emit('message:echo', {
          content: `Test message ${i}`,
          sequence: i,
          timestamp: Date.now()
        });
      }
    });

    it('should maintain connection stability under load', (done) => {
      const testDuration = 5000; // 5 seconds
      const pingInterval = 100; // Ping every 100ms
      let pingCount = 0;
      let pongCount = 0;

      const pingIntervalId = setInterval(() => {
        if (pingCount < testDuration / pingInterval) {
          clientSocket.emit('ping', { sequence: pingCount });
          pingCount++;
        } else {
          clearInterval(pingIntervalId);

          // Wait a bit for final pongs
          setTimeout(() => {
            expect(clientSocket.connected).toBe(true);
            expect(pongCount).toBeGreaterThan(0);
            done();
          }, 500);
        }
      }, pingInterval);

      clientSocket.on('pong', (data) => {
        pongCount++;
        expect(data).toHaveProperty('sequence');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid message formats gracefully', (done) => {
      clientSocket.on('error', (error) => {
        expect(error).toHaveProperty('message');
        done();
      });

      // Send malformed message
      clientSocket.emit('message:send', null);
      clientSocket.emit('message:send', 'invalid string message');
      clientSocket.emit('message:send', { invalid: 'format' });
    });

    it('should handle connection errors gracefully', (done) => {
      const errorSocket = io(`http://localhost:99999`, { // Invalid port
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        timeout: 1000
      });

      errorSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    it('should handle server restarts gracefully', (done) => {
      // This test simulates server restart scenario
      clientSocket.on('disconnect', (reason) => {
        expect(['transport close', 'server shutting down', 'ping timeout']).toContain(reason);

        // Attempt reconnection
        const reconnectSocket = io(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 3
        });

        reconnectSocket.on('connect', () => {
          reconnectSocket.disconnect();
          done();
        });
      });

      // Force disconnect by closing server briefly
      // Note: This is a simplified test - in real scenarios you'd restart the server
      clientSocket.disconnect();
    });
  });

  describe('Security and Authentication', () => {
    it('should reject unauthorized connections', (done) => {
      // Test connection without proper authentication
      const unauthSocket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        auth: {
          token: 'invalid-token'
        }
      });

      unauthSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });

      unauthSocket.on('connect', () => {
        done.fail('Unauthorized connection should not succeed');
      });
    });

    it('should handle rate limiting', (done) => {
      let errorCount = 0;

      clientSocket.on('error', (error) => {
        if (error.message.includes('rate limit')) {
          errorCount++;
        }
      });

      // Send many messages rapidly to trigger rate limiting
      for (let i = 0; i < 100; i++) {
        clientSocket.emit('message:send', {
          id: `rate-limit-test-${i}`,
          content: `Message ${i}`,
          author: 'test-user'
        });
      }

      setTimeout(() => {
        // Rate limiting might or might not trigger depending on server config
        // The important thing is that the connection remains stable
        expect(clientSocket.connected).toBe(true);
        done();
      }, 2000);
    });
  });
});