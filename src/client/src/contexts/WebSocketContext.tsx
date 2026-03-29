/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type {
  MessageFlowEvent,
  PerformanceMetric,
} from '../../../src/webui/services/WebSocketService';
import type { AlertEvent } from '../types/Alert';
import { logger } from '../utils/logger';

type BotStat = { name: string; messageCount: number; errorCount: number };

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'failed';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  reconnectAttempt: number;
  nextRetryIn: number;
  messageFlow: MessageFlowEvent[];
  alerts: AlertEvent[];
  performanceMetrics: PerformanceMetric[];
  botStats: BotStat[];
  connect: () => void;
  disconnect: () => void;
  retryConnection: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL = rawBaseUrl?.replace(/\/$/, '');

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);
  const [messageFlow, setMessageFlow] = useState<MessageFlowEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [botStats, setBotStats] = useState<BotStat[]>([]);

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasConnectedRef = useRef(false);

  // Clear countdown interval
  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Start countdown timer for next retry
  const startCountdown = useCallback((delay: number) => {
    clearCountdown();
    setNextRetryIn(Math.ceil(delay / 1000));

    countdownIntervalRef.current = setInterval(() => {
      setNextRetryIn(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearCountdown();
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [clearCountdown]);

  const connect = useCallback(() => {
    if (socket?.connected) { return; }

    const connectionTarget = API_BASE_URL && API_BASE_URL.length > 0 ? API_BASE_URL : undefined;
    const tokenString = localStorage.getItem('auth_tokens');
    let token = '';
    if (tokenString) {
      try {
        const tokens = JSON.parse(tokenString);
        token = tokens.accessToken;
      } catch (e) {
        logger.error('Failed to parse auth token', e);
      }
    }

    const newSocket = io(connectionTarget, {
      path: '/webui/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });

    newSocket.on('connect', () => {
      logger.info('WebSocket connected');
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempt(0);
      setNextRetryIn(0);
      clearCountdown();
      wasConnectedRef.current = true;
    });

    newSocket.on('disconnect', (reason) => {
      logger.info('WebSocket disconnected', reason);
      setIsConnected(false);
      // Only show disconnected if we were previously connected
      if (wasConnectedRef.current) {
        setConnectionState('disconnected');
      }
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      logger.info(`WebSocket reconnect attempt ${attempt}`);
      setConnectionState('reconnecting');
      setReconnectAttempt(attempt);

      // Calculate next retry delay based on exponential backoff
      const delay = Math.min(1000 * Math.pow(1.5, attempt - 1), 5000);
      startCountdown(delay);
    });

    newSocket.on('reconnect', (attempt) => {
      logger.info(`WebSocket reconnected after ${attempt} attempts`);
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempt(0);
      setNextRetryIn(0);
      clearCountdown();
    });

    newSocket.on('reconnect_error', (error) => {
      logger.error('WebSocket reconnect error:', error);
      setConnectionState('reconnecting');
    });

    newSocket.on('reconnect_failed', () => {
      logger.error('WebSocket reconnect failed');
      setConnectionState('failed');
      clearCountdown();
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
      logger.info('Bot status update:', data);
    });

    // System metrics
    newSocket.on('system_metrics_update', (data) => {
      logger.info('System metrics update:', data);
    });

    // Error handling
    newSocket.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });

    setSocket(newSocket);
  }, [socket, startCountdown, clearCountdown]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setConnectionState('disconnected');
      setReconnectAttempt(0);
      setNextRetryIn(0);
      clearCountdown();
      wasConnectedRef.current = false;
    }
  }, [socket, clearCountdown]);

  const retryConnection = useCallback(() => {
    logger.info('Manual retry connection triggered');
    if (socket) {
      socket.connect();
    } else {
      connect();
    }
  }, [socket, connect]);

  useEffect(() => {
    return () => {
      clearCountdown();
      disconnect();
    };
  }, [clearCountdown, disconnect]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    connectionState,
    reconnectAttempt,
    nextRetryIn,
    messageFlow,
    alerts,
    performanceMetrics,
    botStats,
    connect,
    disconnect,
    retryConnection,
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
