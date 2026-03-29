import React from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

interface WebSocketStatusIndicatorProps {
  /**
   * Show detailed status text alongside the indicator
   */
  showLabel?: boolean;
  /**
   * Size of the status indicator dot
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Custom className for the container
   */
  className?: string;
}

/**
 * WebSocketStatusIndicator displays a visual indicator of the WebSocket connection status.
 * Shows a colored dot (green = connected, yellow = reconnecting, red = disconnected/failed)
 * with optional status text.
 */
export const WebSocketStatusIndicator: React.FC<WebSocketStatusIndicatorProps> = ({
  showLabel = false,
  size = 'md',
  className = '',
}) => {
  const { connectionState, reconnectAttempt, nextRetryIn } = useWebSocket();

  // Determine indicator color and animation
  const getIndicatorClasses = () => {
    const baseClasses = 'rounded-full transition-all duration-300';

    const sizeClasses = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-4 h-4',
    };

    const colorAndAnimation = {
      connected: 'bg-success shadow-success/50 shadow-lg',
      reconnecting: 'bg-warning shadow-warning/50 shadow-lg animate-pulse',
      disconnected: 'bg-error shadow-error/50 shadow-lg',
      failed: 'bg-error shadow-error/50 shadow-lg animate-pulse',
    };

    return `${baseClasses} ${sizeClasses[size]} ${colorAndAnimation[connectionState]}`;
  };

  // Get status text
  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'reconnecting':
        if (nextRetryIn > 0) {
          return `Reconnecting (${nextRetryIn}s)`;
        }
        return reconnectAttempt > 0 ? `Reconnecting (${reconnectAttempt})` : 'Reconnecting';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Connection failed';
      default:
        return 'Unknown';
    }
  };

  // Get status color for text
  const getTextColorClass = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-success';
      case 'reconnecting':
        return 'text-warning';
      case 'disconnected':
      case 'failed':
        return 'text-error';
      default:
        return 'text-base-content';
    }
  };

  // Get accessible label
  const getAriaLabel = () => {
    return `WebSocket status: ${getStatusText()}`;
  };

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="status"
      aria-label={getAriaLabel()}
      title={getStatusText()}
    >
      {/* Status dot indicator */}
      <div className={getIndicatorClasses()} aria-hidden="true" />

      {/* Optional label */}
      {showLabel && (
        <span className={`text-sm font-medium ${getTextColorClass()}`}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default WebSocketStatusIndicator;
