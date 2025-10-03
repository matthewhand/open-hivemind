import { renderHook, waitFor } from '@testing-library/react';
import { useMetrics } from '@/hooks/useMetrics';
import * as metricsService from '@/services/metricsService';

// Mock the metrics service
jest.mock('@/services/metricsService', () => ({
  getMetrics: jest.fn(),
}));

describe('useMetrics Hook', () => {
  const mockMetrics = {
    totalRequests: 1000,
    averageResponseTime: 150,
    errorRate: 0.02,
    activeConnections: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useMetrics());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.metrics).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch metrics successfully', async () => {
    (metricsService.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    const { result } = renderHook(() => useMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle error when fetching metrics fails', async () => {
    (metricsService.getMetrics as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useMetrics());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toBeNull();
      expect(result.current.error).toBe('Failed to fetch metrics');
    });
  });

  it('should set up interval to refresh metrics', async () => {
    (metricsService.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    const { result } = renderHook(() => useMetrics());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockMetrics);
    });

    // Clear the initial call count
    (metricsService.getMetrics as jest.Mock).mockClear();

    // Advance time by 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  it('should clear interval on unmount', async () => {
    (metricsService.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);

    const { unmount } = renderHook(() => useMetrics());

    // Wait for initial fetch
    await waitFor(() => {
      expect(metricsService.getMetrics).toHaveBeenCalledTimes(1);
    });

    // Clear the initial call count
    (metricsService.getMetrics as jest.Mock).mockClear();

    // Unmount the hook
    unmount();

    // Advance time by 5 seconds
    jest.advanceTimersByTime(5000);

    // Should not have been called again
    expect(metricsService.getMetrics).not.toHaveBeenCalled();
  });

  it('should handle errors during interval refresh', async () => {
    (metricsService.getMetrics as jest.Mock)
      .mockResolvedValueOnce(mockMetrics)
      .mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => useMetrics());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.error).toBeNull();
    });

    // Advance time by 5 seconds to trigger error
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch metrics');
    });
  });
});