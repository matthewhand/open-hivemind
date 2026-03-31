import { useEffect } from 'react';
import { useWebSocket as useWebsocketContext } from '../contexts/WebSocketContext';
import { logger } from '../utils/logger';

export interface UseWebSocketOptions {
  topic?: string;
}

export const useWebSocket = (options?: UseWebSocketOptions) => {
  const context = useWebsocketContext();
  const { subscribe, unsubscribe, isConnected } = context;

  useEffect(() => {
    if (options?.topic && isConnected) {
      logger.debug(`Subscribing to topic: ${options.topic}`);
      subscribe(options.topic);

      return () => {
        logger.debug(`Unsubscribing from topic: ${options.topic}`);
        unsubscribe(options.topic!);
      };
    }
  }, [options?.topic, subscribe, unsubscribe, isConnected]);

  // Map Context values back to the original interface expected by consumers like ActivityMonitor and ActivityCharts
  return {
    socket: context.socket,
    connected: isConnected,

    // Maintain backwards compatibility with original hook properties
    messages: context.messageFlow,
    metrics: context.performanceMetrics,

    // Expose context directly
    ...context
  };
};