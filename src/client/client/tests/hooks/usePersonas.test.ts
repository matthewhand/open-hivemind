import { renderHook, waitFor, act } from '@testing-library/react';
import { usePersonas } from '@/hooks/usePersonas';
import * as agentService from '@/services/agentService';

// Mock the agent service
jest.mock('@/services/agentService', () => ({
  getPersonas: jest.fn(),
  getAgents: jest.fn(),
}));

describe('usePersonas Hook', () => {
  const mockPersonas = [
    { id: '1', name: 'Assistant', description: 'General assistant' },
    { id: '2', name: 'Teacher', description: 'Educational assistant' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => usePersonas());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.personas).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch personas successfully', async () => {
    (agentService.getPersonas as jest.Mock).mockResolvedValue(mockPersonas);

    const { result } = renderHook(() => usePersonas());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.personas).toEqual(mockPersonas);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle error when fetching personas fails', async () => {
    (agentService.getPersonas as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => usePersonas());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.personas).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch personas');
    });
  });

  it('should refetch personas when refetch is called', async () => {
    (agentService.getPersonas as jest.Mock)
      .mockResolvedValueOnce(mockPersonas)
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => usePersonas());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.personas).toEqual(mockPersonas);
    });

    // Call refetch
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.personas).toEqual([]);
    });

    // Should have been called twice
    expect(agentService.getPersonas).toHaveBeenCalledTimes(2);
  });

  it('should set loading to true during refetch', async () => {
    (agentService.getPersonas as jest.Mock).mockResolvedValue(mockPersonas);

    const { result } = renderHook(() => usePersonas());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call refetch
    act(() => {
      result.current.refetch();
    });

    // Should be loading during refetch
    expect(result.current.loading).toBe(true);

    // Wait for refetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should clear error on successful refetch', async () => {
    (agentService.getPersonas as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(mockPersonas);

    const { result } = renderHook(() => usePersonas());

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch personas');
    });

    // Call refetch
    act(() => {
      result.current.refetch();
    });

    // Wait for successful refetch
    await waitFor(() => {
      expect(result.current.error).toBeNull();
      expect(result.current.personas).toEqual(mockPersonas);
    });
  });
});