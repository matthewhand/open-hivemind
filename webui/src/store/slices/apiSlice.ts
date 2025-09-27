import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Bot, ConfigResponse, StatusResponse, ConfigSourcesResponse, SecureConfig } from '../../services/api';

// Define proper types for API responses
interface AnalyticsResponse {
  totalMessages: number;
  totalBots: number;
  activeConnections: number;
  averageResponseTime: number;
  errorRate: number;
  topChannels: Array<{ channelId: string; messageCount: number }>;
  providerUsage: Record<string, number>;
  dailyStats: Array<{ date: string; messages: number; errors: number }>;
}

interface PerformanceMetricsResponse {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  activeConnections: number;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Config', 'Status', 'SecureConfig', 'Analytics', 'Performance'],
  endpoints: (builder) => ({
    getConfig: builder.query<ConfigResponse, void>({
      query: () => '/webui/api/config',
      providesTags: ['Config'],
    }),
    
    getStatus: builder.query<StatusResponse, void>({
      query: () => '/dashboard/api/status',
      providesTags: ['Status'],
      // Polling will be handled by a custom hook
    }),
    
    getConfigSources: builder.query<ConfigSourcesResponse, void>({
      query: () => '/webui/api/config/sources',
      providesTags: ['Config'],
    }),
    
    reloadConfig: builder.mutation<{ success: boolean; message: string; timestamp: string }, void>({
      query: () => ({
        url: '/webui/api/config/reload',
        method: 'POST',
      }),
      invalidatesTags: ['Config', 'Status'],
    }),
    
    createBot: builder.mutation<{ success: boolean; message: string; bot: Bot }, {
      name: string;
      messageProvider: string;
      llmProvider: string;
      config?: Record<string, unknown>;
    }>({
      query: (botData) => ({
        url: '/webui/api/bots',
        method: 'POST',
        body: botData,
      }),
      invalidatesTags: ['Config', 'Status'],
    }),
    
    cloneBot: builder.mutation<{ success: boolean; message: string; bot: Bot }, {
      name: string;
      newName: string;
    }>({
      query: ({ name, newName }) => ({
        url: `/webui/api/bots/${name}/clone`,
        method: 'POST',
        body: { newName },
      }),
      invalidatesTags: ['Config', 'Status'],
    }),
    
    deleteBot: builder.mutation<{ success: boolean; message: string }, string>({
      query: (name) => ({
        url: `/webui/api/bots/${name}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Config', 'Status'],
    }),
    
    getSecureConfigs: builder.query<{ configs: SecureConfig[] }, void>({
      query: () => '/webui/api/secure-configs',
      providesTags: ['SecureConfig'],
    }),
    
    getSecureConfig: builder.query<{ config: SecureConfig }, string>({
      query: (name) => `/webui/api/secure-configs/${name}`,
      providesTags: ['SecureConfig'],
    }),
    
    saveSecureConfig: builder.mutation<{ success: boolean; message: string; config: SecureConfig }, {
      name: string;
      data: Record<string, unknown>;
      encryptSensitive?: boolean;
    }>({
      query: ({ name, data, encryptSensitive = true }) => ({
        url: '/webui/api/secure-configs',
        method: 'POST',
        body: { name, data, encryptSensitive },
      }),
      invalidatesTags: ['SecureConfig'],
    }),
    
    deleteSecureConfig: builder.mutation<{ success: boolean; message: string }, string>({
      query: (name) => ({
        url: `/webui/api/secure-configs/${name}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SecureConfig'],
    }),
    
    backupSecureConfigs: builder.mutation<{ success: boolean; message: string; backupFile: string }, void>({
      query: () => ({
        url: '/webui/api/secure-configs/backup',
        method: 'POST',
      }),
    }),
    
    restoreSecureConfigs: builder.mutation<{ success: boolean; message: string }, { backupFile: string }>({
      query: (backupFile) => ({
        url: '/webui/api/secure-configs/restore',
        method: 'POST',
        body: backupFile,
      }),
    }),
    
    getSecureConfigInfo: builder.query<{
      configDirectory: string;
      totalConfigs: number;
      directorySize: number;
      lastModified: string;
    }, void>({
      query: () => '/webui/api/secure-configs/info',
      providesTags: ['SecureConfig'],
    }),
    
    // Advanced analytics endpoints
    getAnalytics: builder.query<AnalyticsResponse, { timeRange?: '24h' | '7d' | '30d' | '90d' }>({
      query: (params) => ({
        url: '/webui/api/analytics',
        params,
      }),
      providesTags: ['Analytics'],
    }),
    
    getPerformanceMetrics: builder.query<PerformanceMetricsResponse, void>({
      query: () => '/webui/api/performance',
      providesTags: ['Performance'],
      // Polling will be handled by a custom hook
    }),
  }),
});

export const {
  useGetConfigQuery,
  useGetStatusQuery,
  useGetConfigSourcesQuery,
  useReloadConfigMutation,
  useCreateBotMutation,
  useCloneBotMutation,
  useDeleteBotMutation,
  useGetSecureConfigsQuery,
  useGetSecureConfigQuery,
  useSaveSecureConfigMutation,
  useDeleteSecureConfigMutation,
  useBackupSecureConfigsMutation,
  useRestoreSecureConfigsMutation,
  useGetSecureConfigInfoQuery,
  useGetAnalyticsQuery,
  useGetPerformanceMetricsQuery,
} = apiSlice;