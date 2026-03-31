import { apiService } from './api';
import Debug from 'debug';

const debug = Debug('app:client:services:usageTrackingService');

export interface ToolUsageMetrics {
  toolId: string;
  serverName: string;
  toolName: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  firstUsed: string;
  totalDuration: number;
  averageDuration: number;
}

export interface ProviderUsageMetrics {
  serverName: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  firstUsed: string;
  totalDuration: number;
  averageDuration: number;
  toolCount: number;
}

export interface AggregateStats {
  totalTools: number;
  totalProviders: number;
  totalExecutions: number;
  totalSuccesses: number;
  totalFailures: number;
  overallSuccessRate: number;
  averageDuration: number;
}

class UsageTrackingService {
  private baseUrl = '/api/usage-tracking';

  async getAllToolMetrics(): Promise<ToolUsageMetrics[]> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/tools`);
      return data.data || [];
    } catch (error) {
      debug('Error fetching tool metrics:', error);
      return [];
    }
  }

  async getToolMetrics(toolId: string): Promise<ToolUsageMetrics | null> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/tools/${encodeURIComponent(toolId)}`);
      return data.data || null;
    } catch (error) {
      debug('Error fetching tool metrics:', error);
      return null;
    }
  }

  async getAllProviderMetrics(): Promise<ProviderUsageMetrics[]> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/providers`);
      return data.data || [];
    } catch (error) {
      debug('Error fetching provider metrics:', error);
      return [];
    }
  }

  async getProviderMetrics(serverName: string): Promise<ProviderUsageMetrics | null> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/providers/${encodeURIComponent(serverName)}`);
      return data.data || null;
    } catch (error) {
      debug('Error fetching provider metrics:', error);
      return null;
    }
  }

  async getProviderToolMetrics(serverName: string): Promise<ToolUsageMetrics[]> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/providers/${encodeURIComponent(serverName)}/tools`);
      return data.data || [];
    } catch (error) {
      debug('Error fetching provider tool metrics:', error);
      return [];
    }
  }

  async getTopTools(limit: number = 10): Promise<ToolUsageMetrics[]> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/top-tools?limit=${limit}`);
      return data.data || [];
    } catch (error) {
      debug('Error fetching top tools:', error);
      return [];
    }
  }

  async getTopProviders(limit: number = 10): Promise<ProviderUsageMetrics[]> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/top-providers?limit=${limit}`);
      return data.data || [];
    } catch (error) {
      debug('Error fetching top providers:', error);
      return [];
    }
  }

  async getRecentTools(limit: number = 10): Promise<ToolUsageMetrics[]> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/recent-tools?limit=${limit}`);
      return data.data || [];
    } catch (error) {
      debug('Error fetching recent tools:', error);
      return [];
    }
  }

  async getAggregateStats(): Promise<AggregateStats | null> {
    try {
      const data = await apiService.get<any>(`${this.baseUrl}/stats`);
      return data.data || null;
    } catch (error) {
      debug('Error fetching aggregate stats:', error);
      return null;
    }
  }

  async clearAllData(): Promise<boolean> {
    try {
      await apiService.delete(`${this.baseUrl}/clear`);
      return true;
    } catch (error) {
      debug('Error clearing usage data:', error);
      return false;
    }
  }
}

export default new UsageTrackingService();
