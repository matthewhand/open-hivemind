import { useWebSocket as useWsContext } from '../contexts/WebSocketContext';

export const useWebSocket = () => {
  const context = useWsContext();

  return {
    socket: context.socket,
    messages: context.messageFlow,
    metrics: context.performanceMetrics,
    connected: context.isConnected,
  };
};
