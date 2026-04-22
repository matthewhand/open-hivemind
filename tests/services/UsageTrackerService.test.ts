import fs from 'fs';
import path from 'path';
import { UsageTrackerService, type UsageUpdateData } from '../../src/server/services/UsageTrackerService';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      ...actualFs.promises,
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
      access: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('{}'),
    }
  };
});

describe('UsageTrackerService', () => {
  let service: UsageTrackerService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default mock for readFile to prevent state leakage
    (fs.promises.readFile as jest.Mock).mockResolvedValue('{}');
    // Reset singleton
    (UsageTrackerService as any).instance = undefined;
    service = UsageTrackerService.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const sampleUpdate: UsageUpdateData = {
    toolId: 'weather-get_forecast',
    serverName: 'weather',
    toolName: 'get_forecast',
    success: true,
    duration: 100,
    timestamp: new Date().toISOString()
  };

  it('should be a singleton', () => {
    const s2 = UsageTrackerService.getInstance();
    expect(service).toBe(s2);
  });

  it('should record tool usage and aggregate metrics', async () => {
    await service.recordUsage(sampleUpdate);
    
    const metrics = service.getToolMetrics(sampleUpdate.toolId);
    expect(metrics).not.toBeNull();
    expect(metrics?.usageCount).toBe(1);
    expect(metrics?.successCount).toBe(1);
    expect(metrics?.totalDuration).toBe(100);
  });

  it('should record provider usage metrics', async () => {
    await service.recordUsage(sampleUpdate);
    
    const metrics = service.getProviderMetrics(sampleUpdate.serverName);
    expect(metrics).not.toBeNull();
    expect(metrics?.usageCount).toBe(1);
    expect(metrics?.toolCount).toBe(1);
  });

  it('should handle multiple tool executions and update averages', async () => {
    await service.recordUsage(sampleUpdate);
    await service.recordUsage({ ...sampleUpdate, duration: 200 });
    
    const metrics = service.getToolMetrics(sampleUpdate.toolId);
    expect(metrics?.usageCount).toBe(2);
    expect(metrics?.totalDuration).toBe(300);
    expect(metrics?.averageDuration).toBe(150);
  });

  it('should debounce saving to disk', async () => {
    await service.recordUsage(sampleUpdate);
    
    // Should not have saved yet
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
    
    // Fast-forward time
    jest.advanceTimersByTime(1500);
    
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('tool-usage-metrics.json'),
      expect.any(String),
      'utf8'
    );
  });

  it('should load existing data on initialization', async () => {
    const existingData = {
      tools: {
        'old-tool': { toolId: 'old-tool', usageCount: 5, successCount: 5 }
      },
      providers: {},
      lastUpdated: new Date().toISOString()
    };
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingData));
    
    // Re-initialize to trigger load
    (UsageTrackerService as any).instance = undefined;
    const newService = UsageTrackerService.getInstance();
    
    // Use real timers for this part to allow async init to complete
    jest.useRealTimers();
    await new Promise(resolve => setTimeout(resolve, 50));
    jest.useFakeTimers();
    
    expect(newService.getToolMetrics('old-tool')).toMatchObject({ usageCount: 5 });
  });

  it('should provide top tools sorted by usage', async () => {
    await service.recordUsage(sampleUpdate); // 1 call
    await service.recordUsage({ ...sampleUpdate, toolId: 't1' }); // 1 call
    await service.recordUsage({ ...sampleUpdate, toolId: 't2' }); // 1 call
    await service.recordUsage({ ...sampleUpdate, toolId: 't2' }); // 2 calls total for t2
    
    const top = service.getTopTools(5);
    expect(top[0].toolId).toBe('t2');
  });
});
