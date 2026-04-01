import { create } from 'zustand';
import type { Socket } from 'socket.io-client';

export interface WebSocketMessage {
  id: string;
  type: 'status_update' | 'config_change' | 'error' | 'notification' | 'metric_update';
  payload: unknown;
  timestamp: string;
}

interface WebSocketState {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  lastMessage: WebSocketMessage | null;
  messages: WebSocketMessage[];
  connectionAttempts: number;
  maxConnectionAttempts: number;
  reconnectInterval: number;
  shouldReconnect: boolean;
  connectionError: string | null;
  subscriptions: string[];
}

interface WebSocketActions {
  connectStart: () => void;
  connectSuccess: (socket: Socket) => void;
  connectFailure: (error: string) => void;
  disconnect: () => void;
  receiveMessage: (message: WebSocketMessage) => void;
  clearMessages: () => void;
  clearMessagesByType: (type: WebSocketMessage['type']) => void;
  setReconnectInterval: (interval: number) => void;
  setShouldReconnect: (should: boolean) => void;
  setMaxConnectionAttempts: (max: number) => void;
  resetConnectionAttempts: () => void;
  setSubscriptions: (subscriptions: string[]) => void;
  addSubscription: (subscription: string) => void;
  removeSubscription: (subscription: string) => void;
  clearConnectionError: () => void;
}

export const useWebSocketStore = create<WebSocketState & WebSocketActions>((set, get) => ({
  socket: null,
  isConnected: false,
  isConnecting: false,
  lastMessage: null,
  messages: [],
  connectionAttempts: 0,
  maxConnectionAttempts: 5,
  reconnectInterval: 3000,
  shouldReconnect: true,
  connectionError: null,
  subscriptions: ['status', 'config', 'notifications', 'metrics'],

  connectStart: () => set({ isConnecting: true, connectionError: null }),

  connectSuccess: (socket) =>
    set({ socket, isConnected: true, isConnecting: false, connectionAttempts: 0, connectionError: null }),

  connectFailure: (connectionError) =>
    set({ isConnected: false, isConnecting: false, connectionError, connectionAttempts: get().connectionAttempts + 1 }),

  disconnect: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null, isConnected: false, isConnecting: false });
  },

  receiveMessage: (message) => {
    const messages = [message, ...get().messages].slice(0, 100);
    set({ lastMessage: message, messages });
  },

  clearMessages: () => set({ messages: [], lastMessage: null }),

  clearMessagesByType: (type) => {
    const messages = get().messages.filter((m) => m.type !== type);
    const lastMessage = get().lastMessage?.type === type ? null : get().lastMessage;
    set({ messages, lastMessage });
  },

  setReconnectInterval: (interval) => set({ reconnectInterval: Math.max(1000, interval) }),

  setShouldReconnect: (shouldReconnect) => set({ shouldReconnect }),

  setMaxConnectionAttempts: (max) => set({ maxConnectionAttempts: Math.max(1, max) }),

  resetConnectionAttempts: () => set({ connectionAttempts: 0 }),

  setSubscriptions: (subscriptions) => set({ subscriptions }),

  addSubscription: (subscription) => {
    if (!get().subscriptions.includes(subscription)) {
      set({ subscriptions: [...get().subscriptions, subscription] });
    }
  },

  removeSubscription: (subscription) => {
    set({ subscriptions: get().subscriptions.filter((s) => s !== subscription) });
  },

  clearConnectionError: () => set({ connectionError: null }),
}));
