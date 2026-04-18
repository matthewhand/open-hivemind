/**
 * Custom hook for managing provider configurations.
 * Extracts common provider CRUD logic to reduce code duplication (DRY).
 */

import { useState, useCallback, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { apiService } from '../../services/api';

export interface ProviderItem {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  isActive: boolean;
}

export interface UseProviderConfigOptions {
  apiEndpoint: string;
  initialSortOrder?: string[];
}

export interface UseProviderConfigResult {
  providers: ProviderItem[];
  loading: boolean;
  error: string | null;
  toast: { show: boolean; message: string; type: 'success' | 'error' };
  setToast: (toast: { show: boolean; message: string; type: 'success' | 'error' }) => void;
  fetchProviders: () => Promise<void>;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  handleSaveProvider: (editingProvider: ProviderItem | null, formData: Record<string, unknown>) => Promise<void>;
  handleDeleteProvider: (providerId: string, onSuccess?: () => void) => Promise<void>;
  handleToggleActive: (providerId: string, isActive: boolean) => Promise<void>;
}

/**
 * Hook for managing provider configurations with CRUD operations.
 * @param options Configuration options including API endpoint
 * @returns Object with providers state and handler functions
 */
export function useProviderConfig(options: UseProviderConfigOptions): UseProviderConfigResult {
  const { apiEndpoint, initialSortOrder = [] } = options;

  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  /**
   * Fetch providers from the API endpoint.
   */
  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data: unknown = await apiService.get(apiEndpoint);
      const fetchedProviders = (data as { providers?: ProviderItem[] }).providers || [];
      
      // Apply initial sort order if provided
      if (initialSortOrder.length > 0) {
        const ordered = [...fetchedProviders];
        const sortMap = new Map(initialSortOrder.map((id, index) => [id, index]));
        ordered.sort((a, b) => {
          const aIndex = sortMap.get(a.id) ?? Infinity;
          const bIndex = sortMap.get(b.id) ?? Infinity;
          return aIndex - bIndex;
        });
        setProviders(ordered);
      } else {
        setProviders(fetchedProviders);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch providers`);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, initialSortOrder]);

  // Initial fetch on mount
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  /**
   * Handle drag-and-drop reordering of providers.
   * Updates local state and optionally calls API to persist order.
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setProviders((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });

        setToast({
          show: true,
          message: 'Provider priority updated',
          type: 'success',
        });
      }
    },
    [setToast]
  );

  /**
   * Save a provider (create or update).
   */
  const handleSaveProvider = useCallback(
    async (editingProvider: ProviderItem | null, formData: Record<string, unknown>) => {
      try {
        const url = editingProvider ? `${apiEndpoint}/${editingProvider.id}` : apiEndpoint;
        const body = {
          name: formData.name || editingProvider?.name,
          type: formData.type || editingProvider?.type,
          config: formData,
        };

        if (editingProvider) {
          await apiService.put(url, body);
        } else {
          await apiService.post(url, body);
        }

        setToast({
          show: true,
          message: `Provider ${editingProvider ? 'updated' : 'created'} successfully`,
          type: 'success',
        });

        // Refresh the list
        await fetchProviders();
      } catch (err) {
        setToast({
          show: true,
          message: err instanceof Error ? err.message : `Failed to ${editingProvider ? 'update' : 'create'} provider`,
          type: 'error',
        });
      }
    },
    [apiEndpoint, fetchProviders, setToast]
  );

  /**
   * Delete a provider.
   */
  const handleDeleteProvider = useCallback(
    async (providerId: string, onSuccess?: () => void) => {
      try {
        await apiService.delete(`${apiEndpoint}/${providerId}`);

        setToast({
          show: true,
          message: 'Provider deleted successfully',
          type: 'success',
        });

        await fetchProviders();
        onSuccess?.();
      } catch (err) {
        setToast({
          show: true,
          message: err instanceof Error ? err.message : 'Failed to delete provider',
          type: 'error',
        });
      }
    },
    [apiEndpoint, fetchProviders, setToast]
  );

  /**
   * Toggle provider active status.
   */
  const handleToggleActive = useCallback(
    async (providerId: string, isActive: boolean) => {
      try {
        await apiService.post(`${apiEndpoint}/${providerId}/toggle`, { isActive });
        await fetchProviders();
      } catch (err) {
        setToast({
          show: true,
          message: err instanceof Error ? err.message : 'Failed to update provider status',
          type: 'error',
        });
      }
    },
    [apiEndpoint, fetchProviders, setToast]
  );

  return {
    providers,
    loading,
    error,
    toast,
    setToast,
    fetchProviders,
    handleDragEnd,
    handleSaveProvider,
    handleDeleteProvider,
    handleToggleActive,
  };
}

export default useProviderConfig;
