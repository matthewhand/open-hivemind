import React, { useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from './DaisyUI/ToastNotification';

/**
 * WebSocketStatusToast component manages toast notifications for WebSocket connection state changes.
 * Automatically shows/updates toasts for disconnection, reconnection, and failures.
 */
export const WebSocketStatusToast: React.FC = () => {
  const { connectionState, reconnectAttempt, nextRetryIn, retryConnection } = useWebSocket();
  const { addToast, removeToast } = useToast();

  const currentToastIdRef = useRef<string | null>(null);
  const previousStateRef = useRef<string>('disconnected');

  useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = connectionState;

    // Remove existing toast when state changes
    const removeCurrentToast = () => {
      if (currentToastIdRef.current) {
        removeToast(currentToastIdRef.current);
        currentToastIdRef.current = null;
      }
    };

    // Handle state transitions
    if (connectionState === 'disconnected' && previousState === 'connected') {
      // Connection lost - show reconnecting toast
      removeCurrentToast();
      currentToastIdRef.current = addToast({
        type: 'warning',
        title: 'Connection lost',
        message: 'Reconnecting...',
        persistent: true,
      });
    } else if (connectionState === 'reconnecting') {
      // Update reconnecting toast with attempt info
      removeCurrentToast();

      const message = nextRetryIn > 0
        ? `Retrying in ${nextRetryIn}s... (attempt ${reconnectAttempt})`
        : `Reconnecting... (attempt ${reconnectAttempt})`;

      currentToastIdRef.current = addToast({
        type: 'warning',
        title: 'Connection lost',
        message,
        persistent: true,
        actions: [
          {
            label: 'Retry now',
            action: retryConnection,
            style: 'primary',
          },
        ],
      });
    } else if (connectionState === 'connected' && (previousState === 'reconnecting' || previousState === 'disconnected')) {
      // Reconnected successfully
      removeCurrentToast();
      currentToastIdRef.current = addToast({
        type: 'success',
        title: 'Reconnected!',
        message: 'Connection restored successfully.',
        duration: 2000,
      });

      // Clear the toast reference after auto-dismiss
      setTimeout(() => {
        currentToastIdRef.current = null;
      }, 2000);
    } else if (connectionState === 'failed') {
      // Connection failed
      removeCurrentToast();
      currentToastIdRef.current = addToast({
        type: 'error',
        title: 'Connection failed',
        message: 'Unable to connect to the server.',
        persistent: true,
        actions: [
          {
            label: 'Retry',
            action: retryConnection,
            style: 'primary',
          },
        ],
      });
    }

    // Cleanup function
    return () => {
      // Don't remove toasts on unmount, only on state change
    };
  }, [connectionState, reconnectAttempt, nextRetryIn, addToast, removeToast, retryConnection]);

  // This component doesn't render anything - it only manages toasts
  return null;
};

export default WebSocketStatusToast;
