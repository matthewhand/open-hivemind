import type { WebSocketContextType } from '../contexts/WebSocketContext';
import { useWebSocket as useWsContext } from '../contexts/WebSocketContext';

export const useWebSocket = (): {
  socket: WebSocketContextType['socket'];
  messages: WebSocketContextType['messageFlow'];
  metrics: WebSocketContextType['performanceMetrics'];
  connected: WebSocketContextType['isConnected'];
} => {
  const context = useWsContext();

  return {
    socket: context.socket,
    messages: context.messageFlow,
    metrics: context.performanceMetrics,
    connected: context.isConnected,
  };
};
