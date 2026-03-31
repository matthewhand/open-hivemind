/**
 * Comprehensive Usage Tracking API Integration Tests
 * Tests tool usage metrics, provider metrics, and top tools/providers endpoints
 */

import express, { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import usageTrackingRouter from '../../src/server/routes/usage-tracking';
// Get references to mock functions from the mocked module
import { UsageTrackerService } from '../../src/server/services/UsageTrackerService';

// All mock fns created inline in factory to avoid jest.mock hoisting TDZ issues
jest.mock('../../src/server/services/UsageTrackerService', () => ({
  UsageTrackerService: {
    getInstance: jest.fn().mockReturnValue({
      getAllToolMetrics: jest.fn(),
      getToolMetrics: jest.fn(),
      getAllProviderMetrics: jest.fn(),
      getProviderMetrics: jest.fn(),
      getToolMetricsByProvider: jest.fn(),
      getTopTools: jest.fn(),
      getTopProviders: jest.fn(),
      getRecentTools: jest.fn(),
      getAggregateStats: jest.fn(),
      clearAllData: jest.fn(),
    }),
  },
}));

const _usageMockInstance = (UsageTrackerService as any).getInstance();
const mockGetAllToolMetrics = _usageMockInstance.getAllToolMetrics as jest.Mock;
const mockGetToolMetrics = _usageMockInstance.getToolMetrics as jest.Mock;
const mockGetAllProviderMetrics = _usageMockInstance.getAllProviderMetrics as jest.Mock;
const mockGetProviderMetrics = _usageMockInstance.getProviderMetrics as jest.Mock;
const mockGetToolMetricsByProvider = _usageMockInstance.getToolMetricsByProvider as jest.Mock;
const mockGetTopTools = _usageMockInstance.getTopTools as jest.Mock;
const mockGetTopProviders = _usageMockInstance.getTopProviders as jest.Mock;
const mockGetRecentTools = _usageMockInstance.getRecentTools as jest.Mock;
const mockGetAggregateStats = _usageMockInstance.getAggregateStats as jest.Mock;
const mockClearAllData = _usageMockInstance.clearAllData as jest.Mock;

describe('Usage Tracking API - Comprehensive Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/usage-tracking', usageTrackingRouter);

    // Reset mocks
    jest.clearAllMocks();

    // Default mock implementations
    mockGetAllToolMetrics.mockReturnValue([
      {
        toolId: 'server-1-calculator',
        serverName: 'server-1',
        toolName: 'calculator',
        totalCalls: 150,
        successfulCalls: 145,
        failedCalls: 5,
        totalDuration: 7500,
        averageDuration: 50,
        lastUsed: '2024-03-01T12:00:00Z',
      },
      {
        toolId: 'server-1-weather',
        serverName: 'server-1',
        toolName: 'weather',
        totalCalls: 80,
        successfulCalls: 78,
        failedCalls: 2,
        totalDuration: 4000,
        averageDuration: 50,
        lastUsed: '2024-03-01T11:30:00Z',
      },
      {
        toolId: 'server-2-search',
        serverName: 'server-2',
        toolName: 'search',
        totalCalls: 200,
        successfulCalls: 190,
        failedCalls: 10,
        totalDuration: 12000,
        averageDuration: 60,
        lastUsed: '2024-03-01T13:00:00Z',
      },
    ]);

    mockGetAllProviderMetrics.mockReturnValue([
      {
        serverName: 'server-1',
        totalCalls: 230,
        successfulCalls: 223,
        failedCalls: 7,
        totalDuration: 11500,
        averageDuration: 50,
        uniqueTools: 2,
        lastUsed: '2024-03-01T12:00:00Z',
      },
      {
        serverName: 'server-2',
        totalCalls: 200,
        successfulCalls: 190,
        failedCalls: 10,
        totalDuration: 12000,
        averageDuration: 60,
        uniqueTools: 1,
        lastUsed: '2024-03-01T13:00:00Z',
      },
    ]);

    mockGetAggregateStats.mockReturnValue({
      totalTools: 3,
      totalProviders: 2,
      totalCalls: 430,
      successfulCalls: 413,
      failedCalls: 17,
      overallSuccessRate: 96.05,
      averageDuration: 54.65,
      mostUsedTool: 'server-2-search',
      mostUsedProvider: 'server-1',
    });
  });

  // ============================================================================
  // Tool Metrics Tests
  // ============================================================================

  describe('GET /api/usage-tracking/tools - Get All Tool Metrics', () => {
    it('should get metrics for all tools', async () => {
      const response = await request(app).get('/api/usage-tracking/tools').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);

      const tool = response.body.data[0];
      expect(tool).toHaveProperty('toolId');
      expect(tool).toHaveProperty('serverName');
      expect(tool).toHaveProperty('toolName');
      expect(tool).toHaveProperty('totalCalls');
      expect(tool).toHaveProperty('successfulCalls');
      expect(tool).toHaveProperty('failedCalls');
      expect(tool).toHaveProperty('averageDuration');
      expect(tool).toHaveProperty('lastUsed');
    });

    it('should return valid metric values', async () => {
      const response = await request(app).get('/api/usage-tracking/tools').expect(200);

      response.body.data.forEach((tool: any) => {
        expect(tool.totalCalls).toBeGreaterThanOrEqual(0);
        expect(tool.successfulCalls).toBeGreaterThanOrEqual(0);
        expect(tool.failedCalls).toBeGreaterThanOrEqual(0);
        expect(tool.totalCalls).toBe(tool.successfulCalls + tool.failedCalls);
        expect(tool.averageDuration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty metrics', async () => {
      mockGetAllToolMetrics.mockReturnValueOnce([]);

      const response = await request(app).get('/api/usage-tracking/tools').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle service errors (500)', async () => {
      mockGetAllToolMetrics.mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app).get('/api/usage-tracking/tools').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe('TOOL_METRICS_ERROR');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/usage-tracking/tools/:toolId - Get Specific Tool Metrics', () => {
    it('should get metrics for specific tool', async () => {
      mockGetToolMetrics.mockReturnValueOnce({
        toolId: 'server-1-calculator',
        serverName: 'server-1',
        toolName: 'calculator',
        totalCalls: 150,
        successfulCalls: 145,
        failedCalls: 5,
        totalDuration: 7500,
        averageDuration: 50,
        lastUsed: '2024-03-01T12:00:00Z',
      });

      const response = await request(app)
        .get('/api/usage-tracking/tools/server-1-calculator')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.toolId).toBe('server-1-calculator');
      expect(response.body.data.toolName).toBe('calculator');
      expect(mockGetToolMetrics).toHaveBeenCalledWith('server-1-calculator');
    });

    it('should return 404 for non-existent tool', async () => {
      mockGetToolMetrics.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/usage-tracking/tools/nonexistent-tool')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle special characters in tool ID', async () => {
      mockGetToolMetrics.mockReturnValueOnce({
        toolId: 'server-1-tool@special',
        serverName: 'server-1',
        toolName: 'tool@special',
        totalCalls: 10,
        successfulCalls: 10,
        failedCalls: 0,
        totalDuration: 500,
        averageDuration: 50,
        lastUsed: '2024-03-01T12:00:00Z',
      });

      const response = await request(app)
        .get('/api/usage-tracking/tools/server-1-tool@special')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle service errors (500)', async () => {
      mockGetToolMetrics.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/usage-tracking/tools/server-1-calculator')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOOL_METRICS_ERROR');
    });
  });

  // ============================================================================
  // Provider Metrics Tests
  // ============================================================================

  describe('GET /api/usage-tracking/providers - Get All Provider Metrics', () => {
    it('should get metrics for all providers', async () => {
      const response = await request(app).get('/api/usage-tracking/providers').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      const provider = response.body.data[0];
      expect(provider).toHaveProperty('serverName');
      expect(provider).toHaveProperty('totalCalls');
      expect(provider).toHaveProperty('successfulCalls');
      expect(provider).toHaveProperty('failedCalls');
      expect(provider).toHaveProperty('averageDuration');
      expect(provider).toHaveProperty('uniqueTools');
      expect(provider).toHaveProperty('lastUsed');
    });

    it('should calculate provider metrics correctly', async () => {
      const response = await request(app).get('/api/usage-tracking/providers').expect(200);

      response.body.data.forEach((provider: any) => {
        expect(provider.totalCalls).toBe(provider.successfulCalls + provider.failedCalls);
        expect(provider.uniqueTools).toBeGreaterThan(0);
      });
    });

    it('should handle empty provider metrics', async () => {
      mockGetAllProviderMetrics.mockReturnValueOnce([]);

      const response = await request(app).get('/api/usage-tracking/providers').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle service errors (500)', async () => {
      mockGetAllProviderMetrics.mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app).get('/api/usage-tracking/providers').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PROVIDER_METRICS_ERROR');
    });
  });

  describe('GET /api/usage-tracking/providers/:serverName - Get Specific Provider Metrics', () => {
    it('should get metrics for specific provider', async () => {
      mockGetProviderMetrics.mockReturnValueOnce({
        serverName: 'server-1',
        totalCalls: 230,
        successfulCalls: 223,
        failedCalls: 7,
        totalDuration: 11500,
        averageDuration: 50,
        uniqueTools: 2,
        lastUsed: '2024-03-01T12:00:00Z',
      });

      const response = await request(app).get('/api/usage-tracking/providers/server-1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.serverName).toBe('server-1');
      expect(mockGetProviderMetrics).toHaveBeenCalledWith('server-1');
    });

    it('should return 404 for non-existent provider', async () => {
      mockGetProviderMetrics.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/usage-tracking/providers/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle service errors (500)', async () => {
      mockGetProviderMetrics.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app).get('/api/usage-tracking/providers/server-1').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PROVIDER_METRICS_ERROR');
    });
  });

  describe('GET /api/usage-tracking/providers/:serverName/tools - Get Provider Tool Metrics', () => {
    it('should get tool metrics for specific provider', async () => {
      mockGetToolMetricsByProvider.mockReturnValueOnce([
        {
          toolId: 'server-1-calculator',
          toolName: 'calculator',
          totalCalls: 150,
          successfulCalls: 145,
          failedCalls: 5,
        },
        {
          toolId: 'server-1-weather',
          toolName: 'weather',
          totalCalls: 80,
          successfulCalls: 78,
          failedCalls: 2,
        },
      ]);

      const response = await request(app)
        .get('/api/usage-tracking/providers/server-1/tools')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(mockGetToolMetricsByProvider).toHaveBeenCalledWith('server-1');
    });

    it('should return empty array for provider with no tools', async () => {
      mockGetToolMetricsByProvider.mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/usage-tracking/providers/empty-provider/tools')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle service errors (500)', async () => {
      mockGetToolMetricsByProvider.mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/usage-tracking/providers/server-1/tools')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PROVIDER_TOOL_METRICS_ERROR');
    });
  });

  // ============================================================================
  // Top Tools and Providers Tests
  // ============================================================================

  describe('GET /api/usage-tracking/top-tools - Get Top Tools', () => {
    it('should get top 10 tools by default', async () => {
      mockGetTopTools.mockReturnValueOnce([
        { toolId: 'server-2-search', toolName: 'search', totalCalls: 200 },
        { toolId: 'server-1-calculator', toolName: 'calculator', totalCalls: 150 },
        { toolId: 'server-1-weather', toolName: 'weather', totalCalls: 80 },
      ]);

      const response = await request(app).get('/api/usage-tracking/top-tools').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(mockGetTopTools).toHaveBeenCalledWith(10);

      // Verify sorted by totalCalls descending
      expect(response.body.data[0].totalCalls).toBeGreaterThanOrEqual(
        response.body.data[1].totalCalls
      );
    });

    it('should respect custom limit parameter', async () => {
      mockGetTopTools.mockReturnValueOnce([
        { toolId: 'server-2-search', toolName: 'search', totalCalls: 200 },
        { toolId: 'server-1-calculator', toolName: 'calculator', totalCalls: 150 },
        { toolId: 'server-1-weather', toolName: 'weather', totalCalls: 80 },
        { toolId: 'server-3-translate', toolName: 'translate', totalCalls: 60 },
        { toolId: 'server-3-summarize', toolName: 'summarize', totalCalls: 40 },
      ]);

      const response = await request(app).get('/api/usage-tracking/top-tools?limit=5').expect(200);

      expect(response.body.data.length).toBe(5);
      expect(mockGetTopTools).toHaveBeenCalledWith(5);
    });

    it('should handle invalid limit parameter', async () => {
      mockGetTopTools.mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/usage-tracking/top-tools?limit=invalid')
        .expect(200);

      // Should default to 10
      expect(mockGetTopTools).toHaveBeenCalledWith(10);
    });

    it('should handle zero results', async () => {
      mockGetTopTools.mockReturnValueOnce([]);

      const response = await request(app).get('/api/usage-tracking/top-tools').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle service errors (500)', async () => {
      mockGetTopTools.mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app).get('/api/usage-tracking/top-tools').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOP_TOOLS_ERROR');
    });
  });

  describe('GET /api/usage-tracking/top-providers - Get Top Providers', () => {
    it('should get top 10 providers by default', async () => {
      mockGetTopProviders.mockReturnValueOnce([
        { serverName: 'server-1', totalCalls: 230 },
        { serverName: 'server-2', totalCalls: 200 },
      ]);

      const response = await request(app).get('/api/usage-tracking/top-providers').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(mockGetTopProviders).toHaveBeenCalledWith(10);

      // Verify sorted by totalCalls descending
      expect(response.body.data[0].totalCalls).toBeGreaterThanOrEqual(
        response.body.data[1].totalCalls
      );
    });

    it('should respect custom limit parameter', async () => {
      mockGetTopProviders.mockReturnValueOnce([
        { serverName: 'server-1', totalCalls: 230 },
        { serverName: 'server-2', totalCalls: 200 },
        { serverName: 'server-3', totalCalls: 150 },
      ]);

      const response = await request(app)
        .get('/api/usage-tracking/top-providers?limit=3')
        .expect(200);

      expect(response.body.data.length).toBe(3);
      expect(mockGetTopProviders).toHaveBeenCalledWith(3);
    });

    it('should handle service errors (500)', async () => {
      mockGetTopProviders.mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app).get('/api/usage-tracking/top-providers').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOP_PROVIDERS_ERROR');
    });
  });

  // ============================================================================
  // Recent Tools Tests
  // ============================================================================

  describe('GET /api/usage-tracking/recent-tools - Get Recent Tools', () => {
    it('should get 10 most recently used tools by default', async () => {
      mockGetRecentTools.mockReturnValueOnce([
        {
          toolId: 'server-2-search',
          toolName: 'search',
          lastUsed: '2024-03-01T13:00:00Z',
        },
        {
          toolId: 'server-1-calculator',
          toolName: 'calculator',
          lastUsed: '2024-03-01T12:00:00Z',
        },
        {
          toolId: 'server-1-weather',
          toolName: 'weather',
          lastUsed: '2024-03-01T11:30:00Z',
        },
      ]);

      const response = await request(app).get('/api/usage-tracking/recent-tools').expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(mockGetRecentTools).toHaveBeenCalledWith(10);

      // Verify sorted by lastUsed descending
      const timestamps = response.body.data.map((tool: any) => new Date(tool.lastUsed).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    });

    it('should respect custom limit parameter', async () => {
      mockGetRecentTools.mockReturnValueOnce([
        { toolId: 'tool-1', toolName: 'tool-1', lastUsed: '2024-03-01T13:00:00Z' },
        { toolId: 'tool-2', toolName: 'tool-2', lastUsed: '2024-03-01T12:30:00Z' },
        { toolId: 'tool-3', toolName: 'tool-3', lastUsed: '2024-03-01T12:00:00Z' },
        { toolId: 'tool-4', toolName: 'tool-4', lastUsed: '2024-03-01T11:30:00Z' },
        { toolId: 'tool-5', toolName: 'tool-5', lastUsed: '2024-03-01T11:00:00Z' },
      ]);

      const response = await request(app)
        .get('/api/usage-tracking/recent-tools?limit=5')
        .expect(200);

      expect(response.body.data.length).toBe(5);
      expect(mockGetRecentTools).toHaveBeenCalledWith(5);
    });

    it('should handle service errors (500)', async () => {
      mockGetRecentTools.mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app).get('/api/usage-tracking/recent-tools').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RECENT_TOOLS_ERROR');
    });
  });

  // ============================================================================
  // Aggregate Statistics Tests
  // ============================================================================

  describe('GET /api/usage-tracking/stats - Get Aggregate Statistics', () => {
    it('should get aggregate statistics', async () => {
      const response = await request(app).get('/api/usage-tracking/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTools', 3);
      expect(response.body.data).toHaveProperty('totalProviders', 2);
      expect(response.body.data).toHaveProperty('totalCalls', 430);
      expect(response.body.data).toHaveProperty('successfulCalls', 413);
      expect(response.body.data).toHaveProperty('failedCalls', 17);
      expect(response.body.data).toHaveProperty('overallSuccessRate', 96.05);
      expect(response.body.data).toHaveProperty('averageDuration', 54.65);
      expect(response.body.data).toHaveProperty('mostUsedTool', 'server-2-search');
      expect(response.body.data).toHaveProperty('mostUsedProvider', 'server-1');
    });

    it('should calculate success rate correctly', async () => {
      const response = await request(app).get('/api/usage-tracking/stats').expect(200);

      const expectedRate =
        (response.body.data.successfulCalls / response.body.data.totalCalls) * 100;
      expect(response.body.data.overallSuccessRate).toBeCloseTo(expectedRate, 2);
    });

    it('should handle zero calls gracefully', async () => {
      mockGetAggregateStats.mockReturnValueOnce({
        totalTools: 0,
        totalProviders: 0,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        overallSuccessRate: 0,
        averageDuration: 0,
        mostUsedTool: null,
        mostUsedProvider: null,
      });

      const response = await request(app).get('/api/usage-tracking/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCalls).toBe(0);
      expect(response.body.data.overallSuccessRate).toBe(0);
    });

    it('should handle service errors (500)', async () => {
      mockGetAggregateStats.mockImplementationOnce(() => {
        throw new Error('Service error');
      });

      const response = await request(app).get('/api/usage-tracking/stats').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('AGGREGATE_STATS_ERROR');
    });
  });

  // ============================================================================
  // Clear Data Tests
  // ============================================================================

  describe('DELETE /api/usage-tracking/clear - Clear All Usage Data', () => {
    it('should clear all usage data successfully', async () => {
      mockClearAllData.mockResolvedValueOnce(undefined);

      const response = await request(app).delete('/api/usage-tracking/clear').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cleared successfully');
      expect(mockClearAllData).toHaveBeenCalled();
    });

    it('should handle clear errors (500)', async () => {
      mockClearAllData.mockRejectedValueOnce(new Error('Clear failed'));

      const response = await request(app).delete('/api/usage-tracking/clear').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('CLEAR_DATA_ERROR');
    });

    it('should be idempotent', async () => {
      mockClearAllData.mockResolvedValue(undefined);

      // Clear multiple times
      await request(app).delete('/api/usage-tracking/clear').expect(200);
      await request(app).delete('/api/usage-tracking/clear').expect(200);
      await request(app).delete('/api/usage-tracking/clear').expect(200);

      expect(mockClearAllData).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================================
  // Error Handling and Edge Cases
  // ============================================================================

  describe('Error Handling and Edge Cases', () => {
    it('should include timestamp in error responses', async () => {
      mockGetAllToolMetrics.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const response = await request(app).get('/api/usage-tracking/tools').expect(500);

      expect(response.body.timestamp).toBeDefined();
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should include error codes in responses', async () => {
      mockGetTopTools.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const response = await request(app).get('/api/usage-tracking/top-tools').expect(500);

      expect(response.body.code).toBe('TOP_TOOLS_ERROR');
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app)
        .get('/api/usage-tracking/top-tools?limit=abc')
        .expect(200);

      // Should use default limit
      expect(mockGetTopTools).toHaveBeenCalledWith(10);
    });

    it('should handle negative limit values', async () => {
      const response = await request(app).get('/api/usage-tracking/top-tools?limit=-5').expect(200);

      // Should be handled gracefully, likely defaulting to 10
      expect(mockGetTopTools).toHaveBeenCalled();
    });

    it('should handle very large limit values', async () => {
      mockGetTopTools.mockReturnValueOnce([]);

      const response = await request(app)
        .get('/api/usage-tracking/top-tools?limit=999999')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent requests safely', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/api/usage-tracking/tools'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle special characters in provider names', async () => {
      mockGetProviderMetrics.mockReturnValueOnce({
        serverName: 'server-@#$',
        totalCalls: 10,
        successfulCalls: 10,
        failedCalls: 0,
        totalDuration: 500,
        averageDuration: 50,
        uniqueTools: 1,
        lastUsed: '2024-03-01T12:00:00Z',
      });

      const response = await request(app)
        .get('/api/usage-tracking/providers/server-@%23$')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate response structure consistency', async () => {
      const response = await request(app).get('/api/usage-tracking/tools').expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(typeof response.body.success).toBe('boolean');
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array(1000)
        .fill(null)
        .map((_, i) => ({
          toolId: `tool-${i}`,
          toolName: `tool-${i}`,
          totalCalls: Math.floor(Math.random() * 1000),
          successfulCalls: Math.floor(Math.random() * 900),
          failedCalls: Math.floor(Math.random() * 100),
          averageDuration: Math.floor(Math.random() * 100),
          lastUsed: new Date().toISOString(),
        }));

      mockGetAllToolMetrics.mockReturnValueOnce(largeDataset);

      const start = Date.now();
      const response = await request(app).get('/api/usage-tracking/tools').expect(200);
      const duration = Date.now() - start;

      expect(response.body.data.length).toBe(1000);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle rapid successive requests', async () => {
      const requests = Array(20)
        .fill(null)
        .map(() => request(app).get('/api/usage-tracking/stats'));

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(duration).toBeLessThan(3000); // All 20 requests within 3 seconds
    });
  });
});
