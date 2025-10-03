import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '@/contexts/WebSocketContext';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Test component to use the WebSocket context
const TestComponent: React.FC = () => {
  const {
    socket,
    isConnected,
    messageFlow,
    alerts,
    performanceMetrics,
    botStats,
    connect,
    disconnect,
  } = useWebSocket();

  return (
    <div>
      <div data-testid="is-connected">{isConnected.toString()}</div>
      <div data-testid="message-flow-count">{messageFlow.length}</div>
      <div data-testid="alerts-count">{alerts.length}</div>
      <div data-testid="performance-metrics-count">{performanceMetrics.length}</div>
      <div data-testid="bot-stats-count">{botStats.length}</div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
};

describe('WebSocketContext', () => {
  const mockMessageFlowEvent = {
    id: '1',
    timestamp: '2023-10-26T10:00:00Z',
    botName: 'Test Bot',
    provider: 'discord',
    channelId: '123',
    userId: '456',
    messageType: 'incoming' as const,
    contentLength: 100,
    status: 'success' as const,
  };

  const mockAlertEvent = {
    id: '1',
    timestamp: '2023-10-26T10:00:00Z',
    level: 'warning' as const,
    message: 'Test alert',
    botName: 'Test Bot',
  };

  const mockPerformanceMetric = {
    timestamp: '2023-10-26T10:00:00Z',
    responseTime: 150,
    memoryUsage: 512,
    cpuUsage: 25,
    activeConnections: 10,
    messageRate: 5,
    errorRate: 0.01,
  };

  const mockBotStats = [
    { name: 'Bot 1', messageCount: 100, errorCount: 5 },
    { name: 'Bot 2', messageCount: 200, errorCount: 10 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
    
    // Reset mock implementations
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'connect') {
        // Simulate connection
        setTimeout(() => {
          mockSocket.connected = true;
          callback();
        }, 0);
      }
    });
  });

  it('should provide WebSocket context values', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
    expect(screen.getByTestId('message-flow-count')).toHaveTextContent('0');
    expect(screen.getByTestId('alerts-count')).toHaveTextContent('0');
    expect(screen.getByTestId('performance-metrics-count')).toHaveTextContent('0');
    expect(screen.getByTestId('bot-stats-count')).toHaveTextContent('0');
  });

  it('should connect to WebSocket', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const connectButton = screen.getByText('Connect');
    act(() => {
      connectButton.click();
    });

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )?.[1];
    
    act(() => {
      connectHandler();
    });

    expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
  });

  it('should disconnect from WebSocket', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const disconnectButton = screen.getByText('Disconnect');
    act(() => {
      disconnectButton.click();
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
  });

  it('should handle message flow updates', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the message flow handler
    const messageFlowHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'message_flow_update'
    )?.[1];

    // Simulate message flow update
    const mockData = { messages: [mockMessageFlowEvent] };
    act(() => {
      messageFlowHandler(mockData);
    });

    expect(screen.getByTestId('message-flow-count')).toHaveTextContent('1');
  });

  it('should handle message flow broadcasts', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the message flow broadcast handler
    const messageFlowBroadcastHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'message_flow_broadcast'
    )?.[1];

    // Simulate message flow broadcast
    const mockData = { latest: [mockMessageFlowEvent] };
    act(() => {
      messageFlowBroadcastHandler(mockData);
    });

    expect(screen.getByTestId('message-flow-count')).toHaveTextContent('1');
  });

  it('should handle alerts updates', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the alerts handler
    const alertsHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'alerts_update'
    )?.[1];

    // Simulate alerts update
    const mockData = { alerts: [mockAlertEvent] };
    act(() => {
      alertsHandler(mockData);
    });

    expect(screen.getByTestId('alerts-count')).toHaveTextContent('1');
  });

  it('should handle alerts broadcasts', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the alerts broadcast handler
    const alertsBroadcastHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'alerts_broadcast'
    )?.[1];

    // Simulate alerts broadcast
    const mockData = { alerts: [mockAlertEvent] };
    act(() => {
      alertsBroadcastHandler(mockData);
    });

    expect(screen.getByTestId('alerts-count')).toHaveTextContent('1');
  });

  it('should handle alert updates', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the alert update handler
    const alertUpdateHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'alert_update'
    )?.[1];

    // Simulate alert update
    act(() => {
      alertUpdateHandler(mockAlertEvent);
    });

    expect(screen.getByTestId('alerts-count')).toHaveTextContent('1');
  });

  it('should handle performance metrics updates', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the performance metrics handler
    const performanceMetricsHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'performance_metrics_update'
    )?.[1];

    // Simulate performance metrics update
    const mockData = { metrics: [mockPerformanceMetric] };
    act(() => {
      performanceMetricsHandler(mockData);
    });

    expect(screen.getByTestId('performance-metrics-count')).toHaveTextContent('1');
  });

  it('should handle performance metrics broadcasts', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the performance metrics broadcast handler
    const performanceMetricsBroadcastHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'performance_metrics_broadcast'
    )?.[1];

    // Simulate performance metrics broadcast
    const mockData = { current: mockPerformanceMetric };
    act(() => {
      performanceMetricsBroadcastHandler(mockData);
    });

    expect(screen.getByTestId('performance-metrics-count')).toHaveTextContent('1');
  });

  it('should handle bot stats broadcasts', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Get the bot stats handler
    const botStatsHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'bot_stats_broadcast'
    )?.[1];

    // Simulate bot stats broadcast
    const mockData = { stats: mockBotStats };
    act(() => {
      botStatsHandler(mockData);
    });

    expect(screen.getByTestId('bot-stats-count')).toHaveTextContent('2');
  });

  it('should register all event listeners', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const connectButton = screen.getByText('Connect');
    act(() => {
      connectButton.click();
    });

    const expectedEvents = [
      'connect',
      'disconnect',
      'message_flow_update',
      'message_flow_broadcast',
      'alerts_update',
      'alerts_broadcast',
      'alert_update',
      'performance_metrics_update',
      'performance_metrics_broadcast',
      'bot_stats_broadcast',
      'bot_status_update',
      'system_metrics_update',
      'error',
    ];

    expectedEvents.forEach(event => {
      expect(mockSocket.on).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });

  it('should disconnect on unmount', () => {
    const { unmount } = render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('should throw error when useWebSocket is used outside WebSocketProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useWebSocket must be used within a WebSocketProvider');

    consoleSpy.mockRestore();
  });
});