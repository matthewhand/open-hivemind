import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  close: jest.fn(),
  emit: jest.fn(),
  connected: false,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

describe('useWebSocket Hook', () => {
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

  const mockPerformanceMetric = {
    timestamp: '2023-10-26T10:00:00Z',
    responseTime: 150,
    memoryUsage: 512,
    cpuUsage: 25,
    activeConnections: 10,
    messageRate: 5,
    errorRate: 0.01,
  };

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

  afterEach(() => {
    // Clean up any timers
    jest.clearAllTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWebSocket());
    
    expect(result.current.socket).toBe(mockSocket);
    expect(result.current.messages).toEqual([]);
    expect(result.current.metrics).toEqual([]);
    expect(result.current.connected).toBe(false);
  });

  it('should create socket connection on mount', () => {
    renderHook(() => useWebSocket());
    
    expect(require('socket.io-client').io).toHaveBeenCalledWith('/webui');
  });

  it('should handle socket connection', async () => {
    const { result } = renderHook(() => useWebSocket());
    
    // Wait for connection event
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(result.current.connected).toBe(true);
  });

  it('should handle socket disconnection', () => {
    const { result } = renderHook(() => useWebSocket());
    
    // Get the disconnect handler
    const disconnectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'disconnect'
    )?.[1];

    // Simulate disconnection
    act(() => {
      mockSocket.connected = false;
      disconnectHandler();
    });

    expect(result.current.connected).toBe(false);
  });

  it('should handle message flow updates', () => {
    const { result } = renderHook(() => useWebSocket());
    
    // Get the message flow handler
    const messageFlowHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'messageFlowUpdate'
    )?.[1];

    // Simulate message flow update
    const mockMessages = [mockMessageFlowEvent];
    act(() => {
      messageFlowHandler(mockMessages);
    });

    expect(result.current.messages).toEqual(mockMessages);
  });

  it('should handle performance metrics updates', () => {
    const { result } = renderHook(() => useWebSocket());
    
    // Get the performance metrics handler
    const performanceHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'performanceMetricsUpdate'
    )?.[1];

    // Simulate performance metrics update
    const mockMetrics = [mockPerformanceMetric];
    act(() => {
      performanceHandler(mockMetrics);
    });

    expect(result.current.metrics).toEqual(mockMetrics);
  });

  it('should close socket connection on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket());
    
    unmount();
    
    expect(mockSocket.close).toHaveBeenCalled();
  });

  it('should register all event listeners', () => {
    renderHook(() => useWebSocket());
    
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('messageFlowUpdate', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('performanceMetricsUpdate', expect.any(Function));
  });

  it('should update messages when new message flow data arrives', () => {
    const { result } = renderHook(() => useWebSocket());
    
    // Get the message flow handler
    const messageFlowHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'messageFlowUpdate'
    )?.[1];

    // Send first message
    const firstMessages = [mockMessageFlowEvent];
    act(() => {
      messageFlowHandler(firstMessages);
    });
    expect(result.current.messages).toEqual(firstMessages);

    // Send second message
    const secondMessage = {
      ...mockMessageFlowEvent,
      id: '2',
      messageType: 'outgoing' as const,
    };
    const secondMessages = [secondMessage];
    act(() => {
      messageFlowHandler(secondMessages);
    });
    expect(result.current.messages).toEqual(secondMessages);
  });

  it('should update metrics when new performance data arrives', () => {
    const { result } = renderHook(() => useWebSocket());
    
    // Get the performance metrics handler
    const performanceHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'performanceMetricsUpdate'
    )?.[1];

    // Send first metrics
    const firstMetrics = [mockPerformanceMetric];
    act(() => {
      performanceHandler(firstMetrics);
    });
    expect(result.current.metrics).toEqual(firstMetrics);

    // Send second metrics
    const secondMetric = {
      ...mockPerformanceMetric,
      responseTime: 200,
    };
    const secondMetrics = [secondMetric];
    act(() => {
      performanceHandler(secondMetrics);
    });
    expect(result.current.metrics).toEqual(secondMetrics);
  });
});