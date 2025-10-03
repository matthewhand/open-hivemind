import { renderHook, waitFor } from '@testing-library/react';
import { useAgents } from '@/hooks/useAgents';
import * as agentService from '@/services/agentService';

// Mock the agent service
jest.mock('@/services/agentService', () => ({
  getAgents: jest.fn(),
  getPersonas: jest.fn(),
}));

describe('useAgents Hook', () => {
 const mockAgents = [
    { id: '1', name: 'Agent 1', status: 'active' },
    { id: '2', name: 'Agent 2', status: 'inactive' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAgents());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.agents).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch agents successfully', async () => {
    (agentService.getAgents as jest.Mock).mockResolvedValue(mockAgents);

    const { result } = renderHook(() => useAgents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.agents).toEqual(mockAgents);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle error when fetching agents fails', async () => {
    (agentService.getAgents as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useAgents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.agents).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch agents');
    });
  });

 it('should refetch agents when refetch is called', async () => {
    (agentService.getAgents as jest.Mock).mockResolvedValueOnce(mockAgents).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAgents());

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.agents).toEqual(mockAgents);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.agents).toEqual([]);
    });
 });
});