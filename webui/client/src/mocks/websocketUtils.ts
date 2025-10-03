import { MockWebSocket } from './websocketMock';

export interface WebSocketTestConfig {
  url?: string;
  protocols?: string | string[];
  autoConnect?: boolean;
  simulateLatency?: number;
}

export interface WebSocketEvent {
  type: string;
  data?: any;
  timestamp?: number;
}

export class WebSocketTestUtils {
  private ws: MockWebSocket | null = null;
  private eventLog: WebSocketEvent[] = [];
  private messageHandlers: { [type: string]: Function[] } = {};
  private config: WebSocketTestConfig;

  constructor(config: WebSocketTestConfig = {}) {
    this.config = {
      url: 'ws://localhost:3000',
      autoConnect: true,
      simulateLatency: 0,
      ...config
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new MockWebSocket(this.config.url!, this.config.protocols);
        
        this.ws.onopen = (event) => {
          this.logEvent('open', event);
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.logEvent('message', data);
          this.handleMessage('message', data);
        };

        this.ws.onclose = (event) => {
          this.logEvent('close', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          this.handleMessage('close', event);
        };

        this.ws.onerror = (event) => {
          this.logEvent('error', event);
          this.handleMessage('error', event);
          reject(new Error('WebSocket connection failed'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      this.logEvent('sent', data);
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  on(eventType: string, handler: Function): void {
    if (!this.messageHandlers[eventType]) {
      this.messageHandlers[eventType] = [];
    }
    this.messageHandlers[eventType].push(handler);
  }

  off(eventType: string, handler: Function): void {
    if (this.messageHandlers[eventType]) {
      const index = this.messageHandlers[eventType].indexOf(handler);
      if (index > -1) {
        this.messageHandlers[eventType].splice(index, 1);
      }
    }
  }

  private handleMessage(type: string, data: any): void {
    if (this.messageHandlers[type]) {
      this.messageHandlers[type].forEach(handler => {
        handler(data);
      });
    }
  }

  private logEvent(type: string, data: any): void {
    const event: WebSocketEvent = {
      type,
      data,
      timestamp: Date.now()
    };
    this.eventLog.push(event);
  }

  getEventLog(): WebSocketEvent[] {
    return [...this.eventLog];
  }

  clearEventLog(): void {
    this.eventLog = [];
  }

  waitForEvent(eventType: string, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(eventType, handler);
        reject(new Error(`Timed out waiting for ${eventType} event`));
      }, timeout);

      const handler = (data: any) => {
        clearTimeout(timer);
        resolve(data);
      };

      this.on(eventType, handler);
    });
  }

  simulateMessage(data: any): void {
    if (this.ws) {
      setTimeout(() => {
        this.ws!.simulateMessage(data);
      }, this.config.simulateLatency || 0);
    }
  }

  simulateError(): void {
    if (this.ws) {
      setTimeout(() => {
        this.ws!.simulateError();
      }, this.config.simulateLatency || 0);
    }
  }

  simulateDisconnect(): void {
    if (this.ws) {
      setTimeout(() => {
        this.ws!.simulateDisconnect();
      }, this.config.simulateLatency || 0);
    }
  }

  simulateReconnect(): void {
    this.simulateDisconnect();
    setTimeout(() => {
      this.connect().catch(console.error);
    }, (this.config.simulateLatency || 0) + 100);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

// Utility functions for common WebSocket test scenarios
export const createWebSocketTestUtils = (config?: WebSocketTestConfig) => {
  return new WebSocketTestUtils(config);
};

export const simulateRealTimeUpdates = (utils: WebSocketTestUtils, updates: any[]) => {
  updates.forEach((update, index) => {
    setTimeout(() => {
      utils.simulateMessage(update);
    }, index * 1000); // Send updates every second
  });
};

export const simulateConnectionDrop = (utils: WebSocketTestUtils, reconnectDelay: number = 2000) => {
  utils.simulateDisconnect();
  setTimeout(() => {
    utils.connect().catch(console.error);
  }, reconnectDelay);
};

export const simulateHighLatency = (utils: WebSocketTestUtils, latency: number = 5000) => {
  const originalConfig = utils['config'];
  utils['config'] = { ...originalConfig, simulateLatency: latency };
  
  return () => {
    utils['config'] = originalConfig;
  };
};

// Mock message generators for different real-time scenarios
export const mockMessageGenerators = {
  agentStatusUpdate: (agentId: string, status: string) => ({
    type: 'agent_status_update',
    data: {
      agentId,
      status,
      timestamp: new Date().toISOString(),
      healthDetails: {
        lastActivity: new Date().toISOString(),
        messageCount: Math.floor(Math.random() * 100),
        errorCount: Math.floor(Math.random() * 5)
      }
    }
  }),

  activityUpdate: (agentId: string, activityType: string) => ({
    type: 'activity_update',
    data: {
      agentId,
      activityType,
      timestamp: new Date().toISOString(),
      details: {
        userId: `user-${Math.floor(Math.random() * 1000)}`,
        channelId: `channel-${Math.floor(Math.random() * 100)}`,
        messageType: 'incoming',
        contentLength: Math.floor(Math.random() * 500),
        processingTime: Math.floor(Math.random() * 1000)
      }
    }
  }),

  systemMetrics: () => ({
    type: 'system_metrics',
    data: {
      timestamp: new Date().toISOString(),
      cpu: {
        user: Math.random() * 20,
        system: Math.random() * 10
      },
      memory: {
        used: Math.random() * 1024 * 1024 * 1024, // Random memory usage
        total: 2 * 1024 * 1024 * 1024, // 2GB total
        usage: Math.random() * 0.8 // 0-80% usage
      },
      uptime: Math.floor(Math.random() * 86400) // Random uptime in seconds
    }
  }),

  apiStatusUpdate: (endpointId: string, status: string, responseTime?: number) => ({
    type: 'api_status_update',
    data: {
      endpointId,
      status,
      responseTime: responseTime || Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      statusCode: status === 'online' ? 200 : Math.floor(Math.random() * 500) + 400
    }
  }),

  errorNotification: (errorType: string, message: string) => ({
    type: 'error_notification',
    data: {
      errorType,
      message,
      timestamp: new Date().toISOString(),
      severity: 'error'
    }
  })
};

// Test helper for WebSocket connection state testing
export const testWebSocketConnectionStates = async (utils: WebSocketTestUtils) => {
  const states: number[] = [];
  
  // Track state changes
  const originalLogEvent = utils['logEvent'].bind(utils);
  utils['logEvent'] = (type: string, data: any) => {
    if (type === 'open' || type === 'close') {
      states.push(utils.getReadyState());
    }
    originalLogEvent(type, data);
  };

  return {
    getStates: () => states,
    waitForState: (state: number, timeout: number = 5000) => {
      return new Promise((resolve, reject) => {
        const checkState = () => {
          if (utils.getReadyState() === state) {
            resolve(state);
          } else if (Date.now() > startTime + timeout) {
            reject(new Error(`Timeout waiting for WebSocket state ${state}`));
          } else {
            setTimeout(checkState, 100);
          }
        };
        const startTime = Date.now();
        checkState();
      });
    }
  };
};