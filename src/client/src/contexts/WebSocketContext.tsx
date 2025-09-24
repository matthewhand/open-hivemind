import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  MessageFlowEvent,
  PerformanceMetric,
  AlertEvent
} from '../../../src/webui/services/WebSocketService';

type BotStat = { name: string; messageCount: number; errorCount: number };

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  messageFlow: MessageFlowEvent[];
  alerts: AlertEvent[];
  performanceMetrics: PerformanceMetric[];
  botStats: BotStat[];
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageFlow, setMessageFlow] = useState<MessageFlowEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [botStats, setBotStats] = useState<BotStat[]>([]);

  const connect = () => {
    if (socket?.connected) return;

    const newSocket = io(`${API_BASE_URL}`, {
      path: '/webui/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    // Message flow events
    newSocket.on('message_flow_update', (data) => {
      setMessageFlow(data.messages || []);
    });

    newSocket.on('message_flow_broadcast', (data) => {
      setMessageFlow(prev => [...prev, ...(data.latest || [])].slice(-100));
    });

    // Alert events
    newSocket.on('alerts_update', (data) => {
      setAlerts(data.alerts || []);
    });

    newSocket.on('alerts_broadcast', (data) => {
      setAlerts(prev => [...prev, ...(data.alerts || [])].slice(-50));
    });

    newSocket.on('alert_update', (alert: AlertEvent) => {
      setAlerts(prev => [alert, ...prev].slice(0, 50));
    });

    // Performance metrics
    newSocket.on('performance_metrics_update', (data) => {
      setPerformanceMetrics(data.metrics || []);
    });

    newSocket.on('performance_metrics_broadcast', (data) => {
      setPerformanceMetrics(prev => [...prev, data.current].slice(-60));
    });

    // Bot stats
    newSocket.on('bot_stats_broadcast', (data) => {
      setBotStats(data.stats || []);
    });

    // Bot status updates
    newSocket.on('bot_status_update', (data) => {
      console.log('Bot status update:', data);
    });

    // System metrics
    newSocket.on('system_metrics_update', (data) => {
      console.log('System metrics update:', data);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    messageFlow,
    alerts,
    performanceMetrics,
    botStats,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
