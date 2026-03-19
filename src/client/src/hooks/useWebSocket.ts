import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { logger } from '../utils/logger';

interface MessageFlowEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  messageRate: number;
  errorRate: number;
}

export const useWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<MessageFlowEvent[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('/webui');
    
    newSocket.on('connect', () => {
      logger.info('WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      logger.info('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('messageFlowUpdate', (data: MessageFlowEvent[]) => {
      logger.debug('Received message flow update:', data);
      setMessages(data);
    });

    newSocket.on('performanceMetricsUpdate', (data: PerformanceMetric[]) => {
      logger.debug('Received performance metrics update:', data);
      setMetrics(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return {
    socket,
    messages,
    metrics,
    connected,
  };
};