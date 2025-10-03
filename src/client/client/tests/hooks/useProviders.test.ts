import { renderHook, waitFor } from '@testing-library/react';
import { useProviders } from '@/hooks/useProviders';
import * as providerService from '@/services/providerService';

// Mock the provider service
jest.mock('@/services/providerService', () => ({
  getLlmProviders: jest.fn(),
  getMessengerProviders: jest.fn(),
}));

describe('useProviders Hook', () => {
  const mockLlmProviders = [
    { id: 'openai', name: 'OpenAI', enabled: true },
    { id: 'anthropic', name: 'Anthropic', enabled: false },
  ];

  const mockMessengerProviders = [
    { id: 'discord', name: 'Discord', enabled: true },
    { id: 'slack', name: 'Slack', enabled: true },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useProviders());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.llmProviders).toEqual([]);
    expect(result.current.messengerProviders).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch providers successfully', async () => {
    (providerService.getLlmProviders as jest.Mock).mockResolvedValue(mockLlmProviders);
    (providerService.getMessengerProviders as jest.Mock).mockResolvedValue(mockMessengerProviders);

    const { result } = renderHook(() => useProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.llmProviders).toEqual(mockLlmProviders);
      expect(result.current.messengerProviders).toEqual(mockMessengerProviders);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle error when fetching providers fails', async () => {
    (providerService.getLlmProviders as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.llmProviders).toEqual([]);
      expect(result.current.messengerProviders).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch providers');
    });
  });

  it('should handle partial fetch failure', async () => {
    (providerService.getLlmProviders as jest.Mock).mockRejectedValue(new Error('LLM error'));
    (providerService.getMessengerProviders as jest.Mock).mockResolvedValue(mockMessengerProviders);

    const { result } = renderHook(() => useProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.llmProviders).toEqual([]);
      expect(result.current.messengerProviders).toEqual(mockMessengerProviders);
      expect(result.current.error).toBe('Failed to fetch providers');
    });
  });

  it('should fetch both providers in parallel', async () => {
    const llmPromise = Promise.resolve(mockLlmProviders);
    const messengerPromise = Promise.resolve(mockMessengerProviders);
    
    (providerService.getLlmProviders as jest.Mock).mockReturnValue(llmPromise);
    (providerService.getMessengerProviders as jest.Mock).mockReturnValue(messengerPromise);

    const { result } = renderHook(() => useProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Both services should have been called
    expect(providerService.getLlmProviders).toHaveBeenCalledTimes(1);
    expect(providerService.getMessengerProviders).toHaveBeenCalledTimes(1);
  });

  it('should fetch only LLM providers when messenger fails', async () => {
    (providerService.getLlmProviders as jest.Mock).mockResolvedValue(mockLlmProviders);
    (providerService.getMessengerProviders as jest.Mock).mockRejectedValue(new Error('Messenger error'));

    const { result } = renderHook(() => useProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.llmProviders).toEqual(mockLlmProviders);
      expect(result.current.messengerProviders).toEqual([]);
    });
  });

  it('should fetch only messenger providers when LLM fails', async () => {
    (providerService.getLlmProviders as jest.Mock).mockRejectedValue(new Error('LLM error'));
    (providerService.getMessengerProviders as jest.Mock).mockResolvedValue(mockMessengerProviders);

    const { result } = renderHook(() => useProviders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.llmProviders).toEqual([]);
      expect(result.current.messengerProviders).toEqual(mockMessengerProviders);
    });
  });
});