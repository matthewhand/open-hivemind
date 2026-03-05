/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type {
  MessageFlowEvent,
  PerformanceMetric,
} from '../../../src/webui/services/WebSocketService';
import type { AlertEvent } from '../types/Alert';

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

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = rawBaseUrl?.replace(/\/$/, '');

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageFlow, setMessageFlow] = useState<MessageFlowEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [botStats, setBotStats] = useState<BotStat[]>([]);

  const connect = () => {
    if (socket?.connected) { return; }

    const connectionTarget = API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL : undefined;
    const tokenString = localStorage.getItem('auth_tokens');
    let token = '';
    if (tokenString) {
      try {
        const tokens = JSON.parse(tokenString);
        token = tokens.accessToken;
      } catch (e) {
        console.error('Failed to parse auth token', e);
      }
    }

    const newSocket = io(connectionTarget, {
      path: '/webui/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: token
      }
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
      const incoming = data.alerts || [];
      setAlerts((prev) => {
        const merged = [...prev];
        incoming.forEach((inc: AlertEvent) => {
          const idx = merged.findIndex((a) => a.id === inc.id);
          if (idx !== -1) {
            merged[idx] = inc;
          } else {
            merged.push(inc);
          }
        });
        return merged
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
      });
    });

    newSocket.on('alert_update', (alert: AlertEvent) => {
      setAlerts((prev) => {
        const index = prev.findIndex((a) => a.id === alert.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = alert;
          return updated;
        }
        return [alert, ...prev].slice(0, 50);
      });
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
