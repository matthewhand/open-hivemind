import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WebSocketStatusIndicator } from '../WebSocketStatusIndicator';
import * as WebSocketContext from '../../contexts/WebSocketContext';

// Mock the WebSocket context
vi.mock('../../contexts/WebSocketContext');

describe('WebSocketStatusIndicator', () => {
  const defaultWebSocketState = {
    socket: null,
    isConnected: false,
    connectionState: 'disconnected' as const,
    reconnectAttempt: 0,
    nextRetryIn: 0,
    messageFlow: [],
    alerts: [],
    performanceMetrics: [],
    botStats: [],
    connect: vi.fn(),
    disconnect: vi.fn(),
    retryConnection: vi.fn(),
  };

  it('should render connected status correctly', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
      connectionState: 'connected',
    });

    const { container } = render(<WebSocketStatusIndicator />);

    // Should have green indicator (bg-success)
    const indicator = container.querySelector('.bg-success');
    expect(indicator).toBeInTheDocument();

    // Should have success shadow
    expect(indicator).toHaveClass('shadow-success/50');

    // Check aria-label
    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toHaveAttribute('aria-label', 'WebSocket status: Connected');
  });

  it('should render reconnecting status with animation', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'reconnecting',
      reconnectAttempt: 2,
    });

    const { container } = render(<WebSocketStatusIndicator />);

    // Should have yellow indicator (bg-warning)
    const indicator = container.querySelector('.bg-warning');
    expect(indicator).toBeInTheDocument();

    // Should have pulse animation
    expect(indicator).toHaveClass('animate-pulse');

    // Check aria-label
    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toHaveAttribute('aria-label', 'WebSocket status: Reconnecting (2)');
  });

  it('should render reconnecting status with countdown', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'reconnecting',
      reconnectAttempt: 3,
      nextRetryIn: 5,
    });

    const { container } = render(<WebSocketStatusIndicator />);

    // Check aria-label includes countdown
    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toHaveAttribute('aria-label', 'WebSocket status: Reconnecting (5s)');
  });

  it('should render disconnected status correctly', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'disconnected',
    });

    const { container } = render(<WebSocketStatusIndicator />);

    // Should have red indicator (bg-error)
    const indicator = container.querySelector('.bg-error');
    expect(indicator).toBeInTheDocument();

    // Check aria-label
    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toHaveAttribute('aria-label', 'WebSocket status: Disconnected');
  });

  it('should render failed status with animation', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'failed',
    });

    const { container } = render(<WebSocketStatusIndicator />);

    // Should have red indicator (bg-error)
    const indicator = container.querySelector('.bg-error');
    expect(indicator).toBeInTheDocument();

    // Should have pulse animation for failed state
    expect(indicator).toHaveClass('animate-pulse');
  });

  it('should render with label when showLabel is true', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
      connectionState: 'connected',
    });

    render(<WebSocketStatusIndicator showLabel />);

    // Should show "Connected" text
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should not render label when showLabel is false', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
      connectionState: 'connected',
    });

    render(<WebSocketStatusIndicator showLabel={false} />);

    // Should not show "Connected" text
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('should render small size correctly', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'connected',
    });

    const { container } = render(<WebSocketStatusIndicator size="sm" />);

    const indicator = container.querySelector('.bg-success');
    expect(indicator).toHaveClass('w-2', 'h-2');
  });

  it('should render medium size correctly', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'connected',
    });

    const { container } = render(<WebSocketStatusIndicator size="md" />);

    const indicator = container.querySelector('.bg-success');
    expect(indicator).toHaveClass('w-3', 'h-3');
  });

  it('should render large size correctly', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'connected',
    });

    const { container } = render(<WebSocketStatusIndicator size="lg" />);

    const indicator = container.querySelector('.bg-success');
    expect(indicator).toHaveClass('w-4', 'h-4');
  });

  it('should apply custom className', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'connected',
    });

    const { container } = render(<WebSocketStatusIndicator className="custom-class" />);

    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toHaveClass('custom-class');
  });

  it('should show correct text color for each state', () => {
    // Connected - green text
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'connected',
    });

    const { rerender } = render(<WebSocketStatusIndicator showLabel />);
    expect(screen.getByText('Connected')).toHaveClass('text-success');

    // Reconnecting - yellow text
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'reconnecting',
      reconnectAttempt: 1,
    });

    rerender(<WebSocketStatusIndicator showLabel />);
    expect(screen.getByText(/Reconnecting/)).toHaveClass('text-warning');

    // Disconnected - red text
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'disconnected',
    });

    rerender(<WebSocketStatusIndicator showLabel />);
    expect(screen.getByText('Disconnected')).toHaveClass('text-error');

    // Failed - red text
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'failed',
    });

    rerender(<WebSocketStatusIndicator showLabel />);
    expect(screen.getByText('Connection failed')).toHaveClass('text-error');
  });

  it('should have proper accessibility attributes', () => {
    vi.mocked(WebSocketContext.useWebSocket).mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'connected',
    });

    const { container } = render(<WebSocketStatusIndicator />);

    const statusDiv = container.querySelector('[role="status"]');
    expect(statusDiv).toBeInTheDocument();
    expect(statusDiv).toHaveAttribute('aria-label');
    expect(statusDiv).toHaveAttribute('title');

    // Indicator dot should be aria-hidden
    const indicator = container.querySelector('.bg-success');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
  });
});
