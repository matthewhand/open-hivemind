import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketStatusToast } from '../WebSocketStatusToast';
import * as WebSocketContext from '../../contexts/WebSocketContext';
import * as ToastNotification from '../DaisyUI/ToastNotification';

// Mock the contexts and hooks
vi.mock('../../contexts/WebSocketContext');
vi.mock('../DaisyUI/ToastNotification');

describe('WebSocketStatusToast', () => {
  const mockAddToast = vi.fn();
  const mockRemoveToast = vi.fn();
  const mockRetryConnection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(ToastNotification.useToast).mockReturnValue({
      toasts: [],
      addToast: mockAddToast,
      removeToast: mockRemoveToast,
      clearAll: vi.fn(),
    });
  });

  it('should not show toast when initially disconnected', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: null,
      isConnected: false,
      connectionState: 'disconnected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    render(<WebSocketStatusToast />);

    // Should not add any toast on initial disconnected state
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('should show reconnecting toast when connection is lost', async () => {
    const { rerender } = render(<WebSocketStatusToast />);

    // Initial connected state
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: true,
      connectionState: 'connected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    // Transition to disconnected
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: false,
      connectionState: 'disconnected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    rerender(<WebSocketStatusToast />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Connection lost',
        message: 'Reconnecting...',
        persistent: true,
      });
    });
  });

  it('should show reconnecting toast with retry countdown', async () => {
    const { rerender } = render(<WebSocketStatusToast />);

    // Initial connected state
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: true,
      connectionState: 'connected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    // Transition to reconnecting with countdown
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: false,
      connectionState: 'reconnecting',
      reconnectAttempt: 2,
      nextRetryIn: 5,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    rerender(<WebSocketStatusToast />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Connection lost',
        message: 'Retrying in 5s... (attempt 2)',
        persistent: true,
        actions: [
          {
            label: 'Retry now',
            action: mockRetryConnection,
            style: 'primary',
          },
        ],
      });
    });
  });

  it('should show success toast when reconnected', async () => {
    const { rerender } = render(<WebSocketStatusToast />);

    // Initial reconnecting state
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: false,
      connectionState: 'reconnecting',
      reconnectAttempt: 1,
      nextRetryIn: 3,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    // Transition to connected
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: true,
      connectionState: 'connected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    rerender(<WebSocketStatusToast />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'success',
        title: 'Reconnected!',
        message: 'Connection restored successfully.',
        duration: 2000,
      });
    });
  });

  it('should show error toast when connection fails', async () => {
    const { rerender } = render(<WebSocketStatusToast />);

    // Initial reconnecting state
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: false,
      connectionState: 'reconnecting',
      reconnectAttempt: 3,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    // Transition to failed
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: false,
      connectionState: 'failed',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    rerender(<WebSocketStatusToast />);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Connection failed',
        message: 'Unable to connect to the server.',
        persistent: true,
        actions: [
          {
            label: 'Retry',
            action: mockRetryConnection,
            style: 'primary',
          },
        ],
      });
    });
  });

  it('should remove previous toast when state changes', async () => {
    const toastId = 'test-toast-id';
    mockAddToast.mockReturnValue(toastId);

    const { rerender } = render(<WebSocketStatusToast />);

    // Initial connected state
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: true,
      connectionState: 'connected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    // Transition to disconnected
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: false,
      connectionState: 'disconnected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    rerender(<WebSocketStatusToast />);

    // Should add a toast
    expect(mockAddToast).toHaveBeenCalled();

    // Transition to reconnecting
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: {} as any,
      isConnected: false,
      connectionState: 'reconnecting',
      reconnectAttempt: 1,
      nextRetryIn: 3,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    rerender(<WebSocketStatusToast />);

    // Should remove the previous toast before adding new one
    await waitFor(() => {
      expect(mockRemoveToast).toHaveBeenCalledWith(toastId);
    });
  });

  it('should render without crashing', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      socket: null,
      isConnected: false,
      connectionState: 'disconnected',
      reconnectAttempt: 0,
      nextRetryIn: 0,
      messageFlow: [],
      alerts: [],
      performanceMetrics: [],
      botStats: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      retryConnection: mockRetryConnection,
    });

    const { container } = render(<WebSocketStatusToast />);

    // Component should render nothing (it only manages toasts)
    expect(container.firstChild).toBeNull();
  });
});
