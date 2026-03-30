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
      const response = await fetch(`${this.baseUrl}/tools`);
      if (!response.ok) {
        throw new Error('Failed to fetch tool metrics');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      debug('Error fetching tool metrics:', error);
      return [];
    }
  }

  async getToolMetrics(toolId: string): Promise<ToolUsageMetrics | null> {
    try {
      const response = await fetch(`${this.baseUrl}/tools/${encodeURIComponent(toolId)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch tool metrics');
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      debug('Error fetching tool metrics:', error);
      return null;
    }
  }

  async getAllProviderMetrics(): Promise<ProviderUsageMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/providers`);
      if (!response.ok) {
        throw new Error('Failed to fetch provider metrics');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      debug('Error fetching provider metrics:', error);
      return [];
    }
  }

  async getProviderMetrics(serverName: string): Promise<ProviderUsageMetrics | null> {
    try {
      const response = await fetch(`${this.baseUrl}/providers/${encodeURIComponent(serverName)}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch provider metrics');
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      debug('Error fetching provider metrics:', error);
      return null;
    }
  }

  async getProviderToolMetrics(serverName: string): Promise<ToolUsageMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/providers/${encodeURIComponent(serverName)}/tools`);
      if (!response.ok) {
        throw new Error('Failed to fetch provider tool metrics');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      debug('Error fetching provider tool metrics:', error);
      return [];
    }
  }

  async getTopTools(limit: number = 10): Promise<ToolUsageMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/top-tools?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch top tools');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      debug('Error fetching top tools:', error);
      return [];
    }
  }

  async getTopProviders(limit: number = 10): Promise<ProviderUsageMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/top-providers?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch top providers');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      debug('Error fetching top providers:', error);
      return [];
    }
  }

  async getRecentTools(limit: number = 10): Promise<ToolUsageMetrics[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recent-tools?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recent tools');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      debug('Error fetching recent tools:', error);
      return [];
    }
  }

  async getAggregateStats(): Promise<AggregateStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      if (!response.ok) {
        throw new Error('Failed to fetch aggregate stats');
      }
      const data = await response.json();
      return data.data || null;
    } catch (error) {
      debug('Error fetching aggregate stats:', error);
      return null;
    }
  }

  async clearAllData(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/clear`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to clear usage data');
      }
      return true;
    } catch (error) {
      debug('Error clearing usage data:', error);
      return false;
    }
  }
}

export default new UsageTrackingService();
