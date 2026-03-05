import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Socket } from 'socket.io-client';

interface WebSocketMessage {
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

const initialState: WebSocketState = {
  socket: null,
  isConnected: false,
  isConnecting: false,
  lastMessage: null,
  messages: [],
  connectionAttempts: 0,
  maxConnectionAttempts: 5,
  reconnectInterval: 3000, // 3 seconds
  shouldReconnect: true,
  connectionError: null,
  subscriptions: ['status', 'config', 'notifications', 'metrics'],
};

const websocketSlice = createSlice({
  name: 'websocket',
  initialState,
  reducers: {
    connectStart: (state) => {
      state.isConnecting = true;
      state.connectionError = null;
    },
    
    connectSuccess: (state, action: PayloadAction<Socket>) => {
      state.socket = action.payload;
      state.isConnected = true;
      state.isConnecting = false;
      state.connectionAttempts = 0;
      state.connectionError = null;
    },
    
    connectFailure: (state, action: PayloadAction<string>) => {
      state.isConnected = false;
      state.isConnecting = false;
      state.connectionError = action.payload;
      state.connectionAttempts++;
    },
    
    disconnect: (state) => {
      if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
      }
      state.isConnected = false;
      state.isConnecting = false;
    },
    
    receiveMessage: (state, action: PayloadAction<WebSocketMessage>) => {
      state.lastMessage = action.payload;
      state.messages.unshift(action.payload);
      
      // Keep only last 100 messages
      if (state.messages.length > 100) {
        state.messages = state.messages.slice(0, 100);
      }
    },
    
    clearMessages: (state) => {
      state.messages = [];
      state.lastMessage = null;
    },
    
    clearMessagesByType: (state, action: PayloadAction<WebSocketMessage['type']>) => {
      state.messages = state.messages.filter(msg => msg.type !== action.payload);
      if (state.lastMessage?.type === action.payload) {
        state.lastMessage = null;
      }
    },
    
    setReconnectInterval: (state, action: PayloadAction<number>) => {
      state.reconnectInterval = Math.max(1000, action.payload); // Minimum 1 second
    },
    
    setShouldReconnect: (state, action: PayloadAction<boolean>) => {
      state.shouldReconnect = action.payload;
    },
    
    setMaxConnectionAttempts: (state, action: PayloadAction<number>) => {
      state.maxConnectionAttempts = Math.max(1, action.payload);
    },
    
    resetConnectionAttempts: (state) => {
      state.connectionAttempts = 0;
    },
    
    setSubscriptions: (state, action: PayloadAction<string[]>) => {
      state.subscriptions = action.payload;
    },
    
    addSubscription: (state, action: PayloadAction<string>) => {
      if (!state.subscriptions.includes(action.payload)) {
        state.subscriptions.push(action.payload);
      }
    },
    
    removeSubscription: (state, action: PayloadAction<string>) => {
      state.subscriptions = state.subscriptions.filter(sub => sub !== action.payload);
    },
    
    clearConnectionError: (state) => {
      state.connectionError = null;
    },
  },
});

export const {
  connectStart,
  connectSuccess,
  connectFailure,
  disconnect,
  receiveMessage,
  clearMessages,
  clearMessagesByType,
  setReconnectInterval,
  setShouldReconnect,
  setMaxConnectionAttempts,
  resetConnectionAttempts,
  setSubscriptions,
  addSubscription,
  removeSubscription,
  clearConnectionError,
} = websocketSlice.actions;

export default websocketSlice.reducer;

// Selectors
export const selectWebSocket = (state: { websocket: WebSocketState }) => state.websocket;
export const selectSocket = (state: { websocket: WebSocketState }) => state.websocket.socket;
export const selectIsConnected = (state: { websocket: WebSocketState }) => state.websocket.isConnected;
export const selectIsConnecting = (state: { websocket: WebSocketState }) => state.websocket.isConnecting;
export const selectLastMessage = (state: { websocket: WebSocketState }) => state.websocket.lastMessage;
export const selectMessages = (state: { websocket: WebSocketState }) => state.websocket.messages;
export const selectConnectionAttempts = (state: { websocket: WebSocketState }) => state.websocket.connectionAttempts;
export const selectMaxConnectionAttempts = (state: { websocket: WebSocketState }) => state.websocket.maxConnectionAttempts;
export const selectConnectionError = (state: { websocket: WebSocketState }) => state.websocket.connectionError;
export const selectSubscriptions = (state: { websocket: WebSocketState }) => state.websocket.subscriptions;
export const selectShouldReconnect = (state: { websocket: WebSocketState }) => state.websocket.shouldReconnect;
export const selectReconnectInterval = (state: { websocket: WebSocketState }) => state.websocket.reconnectInterval;

// Computed selectors
export const selectMessagesByType = (type: WebSocketMessage['type']) => (state: { websocket: WebSocketState }) =>
  state.websocket.messages.filter(msg => msg.type === type);

export const selectUnreadMessages = (state: { websocket: WebSocketState }) =>
  state.websocket.messages.filter(msg => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return new Date(msg.timestamp).getTime() > fiveMinutesAgo;
  });

export const selectConnectionStatus = (state: { websocket: WebSocketState }) => {
  const { isConnected, isConnecting, connectionError, connectionAttempts, maxConnectionAttempts } = state.websocket;
  
  if (isConnecting) {return 'connecting';}
  if (isConnected) {return 'connected';}
  if (connectionError) {return 'error';}
  if (connectionAttempts >= maxConnectionAttempts) {return 'failed';}
  return 'disconnected';
};

export const selectConnectionStats = (state: { websocket: WebSocketState }) => {
  const { messages, connectionAttempts, maxConnectionAttempts } = state.websocket;
  
  return {
    totalMessages: messages.length,
    messagesByType: messages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    connectionAttempts,
    maxConnectionAttempts,
    connectionSuccessRate: connectionAttempts > 0 ? ((connectionAttempts - 1) / connectionAttempts) * 100 : 100,
  };
};