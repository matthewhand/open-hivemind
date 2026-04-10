/**
 * Performance Optimization Test Suite
 * Tests for API caching, WebSocket optimization, and component performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiCache, CachedApiService } from '../services/apiCache';
import { wsOptimization, OptimizedWebSocketService } from '../services/wsOptimization';

describe('API Cache Service', () => {
  beforeEach(() => {
    apiCache.clear();
  });

  afterEach(() => {
    apiCache.clear();
  });

  it('should cache and retrieve data correctly', () => {
    const testData = { test: 'data' };
    const key = '/api/test';

    apiCache.set(key, testData);
    const retrieved = apiCache.get(key);

    expect(retrieved).toEqual(testData);
  });

  it('should respect TTL and expire data', async () => {
    const testData = { test: 'data' };
    const key = '/api/test';
    const shortTTL = 100; // 100ms

    apiCache.set(key, testData, shortTTL);
    expect(apiCache.get(key)).toEqual(testData);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(apiCache.get(key)).toBeNull();
  });

  it('should enforce cache size limits', () => {
    const maxSize = 3;
    // Simulate small cache size for testing
    (apiCache as any).config.maxSize = maxSize;

    // Fill cache beyond limit
    for (let i = 0; i < maxSize + 2; i++) {
      apiCache.set(`/api/test${i}`, { data: i });
    }

    const stats = apiCache.getStats();
    expect(stats.size).toBeLessThanOrEqual(maxSize);
  });

  it('should clear cache by pattern', () => {
    apiCache.set('/api/config/test1', { data: 1 });
    apiCache.set('/api/config/test2', { data: 2 });
    apiCache.set('/api/status/test', { data: 3 });

    apiCache.clearPattern('/api/config/');

    expect(apiCache.get('/api/config/test1')).toBeNull();
    expect(apiCache.get('/api/config/test2')).toBeNull();
    expect(apiCache.get('/api/status/test')).toEqual({ data: 3 });
  });

  it('should provide accurate cache statistics', () => {
    apiCache.set('/api/test1', { data: 1 });
    apiCache.set('/api/test2', { data: 2 });

    const stats = apiCache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.entries).toHaveLength(2);
    expect(stats.entries[0]).toHaveProperty('key');
    expect(stats.entries[0]).toHaveProperty('age');
    expect(stats.entries[0]).toHaveProperty('ttl');
  });
});

describe('Cached API Service', () => {
  let mockApiService: any;
  let cachedApiService: CachedApiService;

  beforeEach(() => {
    apiCache.clear();
    mockApiService = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      getConfig: vi.fn(),
      getStatus: vi.fn(),
      getGlobalConfig: vi.fn(),
      getActivity: vi.fn(),
      getServiceHealth: vi.fn(),
    };
    cachedApiService = new CachedApiService(mockApiService);
  });

  it('should cache GET requests', async () => {
    const testData = { test: 'data' };
    mockApiService.get.mockResolvedValue(testData);

    // First call should hit the API
    const result1 = await cachedApiService.get('/api/test');
    expect(mockApiService.get).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(testData);

    // Second call should use cache
    const result2 = await cachedApiService.get('/api/test');
    expect(mockApiService.get).toHaveBeenCalledTimes(1); // Still 1
    expect(result2).toEqual(testData);
  });

  it('should skip cache when requested', async () => {
    const testData = { test: 'data' };
    mockApiService.get.mockResolvedValue(testData);

    await cachedApiService.get('/api/test');
    await cachedApiService.get('/api/test', { skipCache: true });

    expect(mockApiService.get).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache on POST/PUT/DELETE', async () => {
    const testData = { test: 'data' };
    mockApiService.get.mockResolvedValue(testData);
    mockApiService.post.mockResolvedValue({ success: true });

    // Cache some data
    await cachedApiService.get('/api/config/test');
    expect(mockApiService.get).toHaveBeenCalledTimes(1);

    // POST should invalidate related cache
    await cachedApiService.post('/api/config/test', { update: true });

    // Next GET should hit API again
    await cachedApiService.get('/api/config/test');
    expect(mockApiService.get).toHaveBeenCalledTimes(2);
  });
});

describe('WebSocket Optimization Service', () => {
  let mockBroadcastFn: any;

  beforeEach(() => {
    wsOptimization.clearThrottles();
    mockBroadcastFn = vi.fn();
  });

  afterEach(() => {
    wsOptimization.clearThrottles();
  });

  it('should throttle rapid broadcasts', async () => {
    const eventType = 'test';
    const data1 = { message: 'first' };
    const data2 = { message: 'second' };

    // Send two rapid broadcasts
    wsOptimization.optimizeBroadcast(eventType, data1, mockBroadcastFn);
    wsOptimization.optimizeBroadcast(eventType, data2, mockBroadcastFn);

    // Should only broadcast once immediately
    expect(mockBroadcastFn).toHaveBeenCalledTimes(1);

    // Wait for throttle to clear
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(mockBroadcastFn).toHaveBeenCalledTimes(2);
  });

  it('should batch message flow events', () => {
    const eventType = 'messageFlow';
    const message1 = { id: '1', content: 'first' };
    const message2 = { id: '2', content: 'second' };

    wsOptimization.optimizeBroadcast(eventType, message1, mockBroadcastFn);
    wsOptimization.optimizeBroadcast(eventType, message2, mockBroadcastFn);

    // Should batch messages together
    expect(mockBroadcastFn).toHaveBeenCalledWith([message1, message2]);
  });

  it('should merge bot stats by bot name', () => {
    const eventType = 'botStats';
    const stats1 = { botName: 'bot1', messageCount: 5 };
    const stats2 = { botName: 'bot1', messageCount: 10 }; // Updated stats for same bot
    const stats3 = { botName: 'bot2', messageCount: 3 };

    wsOptimization.optimizeBroadcast(eventType, stats1, mockBroadcastFn);
    wsOptimization.optimizeBroadcast(eventType, stats2, mockBroadcastFn);
    wsOptimization.optimizeBroadcast(eventType, stats3, mockBroadcastFn);

    // Should keep latest stats for each bot
    const expectedCall = expect.arrayContaining([
      expect.objectContaining({ botName: 'bot1', messageCount: 10 }),
      expect.objectContaining({ botName: 'bot2', messageCount: 3 })
    ]);
    expect(mockBroadcastFn).toHaveBeenCalledWith(expectedCall);
  });

  it('should remove redundant fields from payloads', () => {
    const eventType = 'test';
    const dataWithRedundancy = {
      important: 'data',
      _internal: 'should be removed',
      metadata: { should: 'be removed' },
      nullValue: null,
      emptyArray: [],
      emptyObject: {},
      validArray: [1, 2, 3]
    };

    wsOptimization.optimizeBroadcast(eventType, dataWithRedundancy, mockBroadcastFn);

    expect(mockBroadcastFn).toHaveBeenCalledWith({
      important: 'data',
      validArray: [1, 2, 3]
    });
  });

  it('should provide optimization statistics', () => {
    wsOptimization.optimizeBroadcast('test1', { data: 1 }, mockBroadcastFn);
    wsOptimization.optimizeBroadcast('test2', { data: 2 }, mockBroadcastFn);

    const stats = wsOptimization.getStats();
    expect(stats).toHaveProperty('activeThrottles');
    expect(stats).toHaveProperty('totalBroadcastsSaved');
    expect(stats).toHaveProperty('averagePayloadReduction');
  });
});

describe('Optimized WebSocket Service', () => {
  let mockWsService: any;
  let optimizedWsService: OptimizedWebSocketService;

  beforeEach(() => {
    wsOptimization.clearThrottles();
    mockWsService = {
      broadcast: vi.fn(),
      recordMessageFlow: vi.fn(),
      recordAlert: vi.fn(),
      getMessageFlow: vi.fn(),
      getAlerts: vi.fn(),
      getPerformanceMetrics: vi.fn(),
    };
    optimizedWsService = new OptimizedWebSocketService(mockWsService);
  });

  it('should optimize individual broadcasts', () => {
    const eventType = 'test';
    const data = { message: 'test' };

    optimizedWsService.broadcast(eventType, data);

    // Should call through optimization layer
    expect(mockWsService.broadcast).toHaveBeenCalled();
  });

  it('should batch multiple events efficiently', () => {
    const events = [
      { type: 'messageFlow', data: { id: '1' } },
      { type: 'messageFlow', data: { id: '2' } },
      { type: 'alerts', data: { level: 'info' } }
    ];

    optimizedWsService.batchBroadcast(events);

    // Should group by event type and broadcast efficiently
    expect(mockWsService.broadcast).toHaveBeenCalledTimes(2); // messageFlow and alerts
  });

  it('should delegate other methods correctly', () => {
    const testData = { test: 'data' };

    optimizedWsService.recordMessageFlow(testData);
    optimizedWsService.recordAlert(testData);
    optimizedWsService.getMessageFlow(10);

    expect(mockWsService.recordMessageFlow).toHaveBeenCalledWith(testData);
    expect(mockWsService.recordAlert).toHaveBeenCalledWith(testData);
    expect(mockWsService.getMessageFlow).toHaveBeenCalledWith(10);
  });
});

describe('Performance Integration Tests', () => {
  it('should handle high-frequency API calls efficiently', async () => {
    const mockApiService = { get: vi.fn().mockResolvedValue({ data: 'test' }) };
    const cachedService = new CachedApiService(mockApiService);

    // Simulate rapid API calls
    const promises = Array.from({ length: 10 }, () => 
      cachedService.get('/api/config/test')
    );

    await Promise.all(promises);

    // Should only make one actual API call due to caching
    expect(mockApiService.get).toHaveBeenCalledTimes(1);
  });

  it('should handle high-frequency WebSocket broadcasts efficiently', async () => {
    const mockBroadcast = vi.fn();
    const events = Array.from({ length: 20 }, (_, i) => ({
      type: 'messageFlow',
      data: { id: i.toString(), message: `Message ${i}` }
    }));

    // Send all events rapidly
    events.forEach(event => {
      wsOptimization.optimizeBroadcast(event.type, event.data, mockBroadcast);
    });

    // Should batch and throttle broadcasts
    expect(mockBroadcast).toHaveBeenCalledTimes(1);
    
    // Wait for any pending broadcasts
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Should have made minimal broadcast calls
    expect(mockBroadcast).toHaveBeenCalledTimes(2); // Initial + throttled
  });

  it('should maintain data integrity during optimization', () => {
    const mockBroadcast = vi.fn();
    const originalData = {
      id: '123',
      timestamp: '2024-01-01T00:00:00Z',
      message: 'Important data',
      metadata: { internal: true },
      _private: 'should be removed'
    };

    wsOptimization.optimizeBroadcast('test', originalData, mockBroadcast);

    const broadcastedData = mockBroadcast.mock.calls[0][0];
    expect(broadcastedData).toHaveProperty('id', '123');
    expect(broadcastedData).toHaveProperty('message', 'Important data');
    expect(broadcastedData).not.toHaveProperty('_private');
    expect(broadcastedData).not.toHaveProperty('metadata');
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  it('should cache API calls within acceptable time limits', async () => {
    const mockApiService = { get: vi.fn().mockResolvedValue({ data: 'test' }) };
    const cachedService = new CachedApiService(mockApiService);

    const startTime = performance.now();
    
    // First call (cache miss)
    await cachedService.get('/api/test');
    const firstCallTime = performance.now() - startTime;

    const cacheStartTime = performance.now();
    
    // Second call (cache hit)
    await cachedService.get('/api/test');
    const cacheCallTime = performance.now() - cacheStartTime;

    // Cache hit should be significantly faster
    expect(cacheCallTime).toBeLessThan(firstCallTime * 0.1); // At least 10x faster
    expect(cacheCallTime).toBeLessThan(5); // Less than 5ms
  });

  it('should optimize WebSocket broadcasts within time limits', () => {
    const mockBroadcast = vi.fn();
    const startTime = performance.now();

    // Send 100 rapid broadcasts
    for (let i = 0; i < 100; i++) {
      wsOptimization.optimizeBroadcast('test', { id: i }, mockBroadcast);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Should complete within reasonable time
    expect(totalTime).toBeLessThan(50); // Less than 50ms for 100 broadcasts
    expect(mockBroadcast).toHaveBeenCalledTimes(1); // Should batch efficiently
  });
});