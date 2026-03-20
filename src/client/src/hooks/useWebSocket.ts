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
    const newSocket = io('/webui', {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });
    
    newSocket.on('connect', () => {
      logger.info('WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      logger.info('WebSocket disconnected', { reason });
      setConnected(false);
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      logger.debug(`WebSocket reconnect attempt ${attempt}`);
    });

    newSocket.on('reconnect', (attempt) => {
      logger.info(`WebSocket reconnected after ${attempt} attempts`);
      setConnected(true);
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